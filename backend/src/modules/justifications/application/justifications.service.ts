import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../shared/domain/errors';
import { toDisplayDate } from '../../../shared/domain/display-date';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { Notifier } from '../../notifications/application/notifier.service';
import { buildRecord, recordContextFor } from '../../attendance/application/attendance-record.view';
import { StudentContextService } from '../../attendance/application/student-context.service';
import { StudentHistoryService } from '../../attendance/application/student-history.service';
import { UpdateAttendanceUseCase } from '../../attendance/application/update-attendance.use-case';
import { STATUS_LABELS, type StoredAttendanceStatus } from '../../attendance/domain/attendance-status';
import { AttendanceRepository } from '../../attendance/domain/attendance.repository';
import { ClassSessionRepository } from '../../class-sessions/domain/class-session.repository';
import { StudentRepository } from '../../students/domain/student.repository';
import type { Justification, JustificationStatus, UploadedImage } from '../domain/justification';
import { ensureStudentCanJustify, ensureValidImages, ensureValidReason } from '../domain/justification-policy';
import { JustificationRepository } from '../domain/justification.repository';

/** Estados con los que el admin puede aprobar una justificación. */
export const APPROVAL_STATUSES: StoredAttendanceStatus[] = ['PRESENTE', 'ATRASO', 'JUSTIFICADO'];

/**
 * Casos especiales de asistencia: el estudiante justifica una falta o un atraso con imágenes de prueba
 * y el admin la aprueba (cambiando la asistencia, con auditoría) o la rechaza.
 */
@Injectable()
export class JustificationsService {
  constructor(
    private readonly justifications: JustificationRepository,
    private readonly activeModule: ActiveModuleService,
    private readonly studentContext: StudentContextService,
    private readonly history: StudentHistoryService,
    private readonly updateAttendance: UpdateAttendanceUseCase,
    private readonly students: StudentRepository,
    private readonly sessions: ClassSessionRepository,
    private readonly attendances: AttendanceRepository,
    private readonly activity: ActivityRecorder,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  /** El estudiante envía su justificación con al menos una imagen. */
  async submit(user: AuthUser, input: { sessionId: number; reason: string; files: UploadedImage[] }) {
    const { module, student } = await this.studentContext.resolve(user);
    const view = await this.history.build(module, student, 'student');
    const record = view.records.find((r) => r.sessionId === input.sessionId);
    if (!record) throw new NotFoundError('La clase no pertenece a tu módulo');

    ensureStudentCanJustify({
      status: record.status,
      classDate: record.date,
      today: view.today,
      existing: await this.justifications.findForSession(student.id, input.sessionId),
      windowDays: module.rules.justificationDays,
    });
    const reason = ensureValidReason(input.reason);
    ensureValidImages(input.files, 1);

    const justification = await this.justifications.create({
      moduleId: module.id,
      studentId: student.id,
      sessionId: input.sessionId,
      origin: 'STUDENT',
      reason,
      status: 'PENDING',
      resolvedStatus: null,
      reviewedBy: null,
      now: this.clock.now(),
      files: input.files,
    });
    await this.activity.record({
      actor: user,
      action: 'SUBMIT_JUSTIFICATION',
      moduleId: module.id,
      studentId: student.id,
      entity: 'justification',
      entityId: justification.id,
      description: `${student.fullName} envió una justificación para la clase del ${toDisplayDate(record.date)}`,
      details: { sessionId: input.sessionId, files: input.files.length },
    });
    await this.notifier.toAdmins({
      moduleId: module.id,
      type: 'JUSTIFICATION_SUBMITTED',
      title: `${student.fullName} envió una justificación`,
      body: `Clase del ${toDisplayDate(record.date)} · ${input.files.length} ${input.files.length === 1 ? 'imagen' : 'imágenes'}: ${reason}`,
      link: '/admin/justificaciones',
    });
    return justification;
  }

  /** El admin corrige una asistencia adjuntando pruebas (queda aprobada de inmediato). */
  async createByAdmin(
    admin: AuthUser,
    input: { studentId: number; sessionId: number; status: StoredAttendanceStatus; reason: string; files: UploadedImage[] },
  ) {
    const module = await this.activeModule.getActiveOrFail();
    const reason = ensureValidReason(input.reason);
    ensureValidImages(input.files, 1);
    // Primero el cambio de asistencia: valida estudiante, fecha y estado, y queda auditado.
    const record = await this.updateAttendance.execute(admin, {
      studentId: input.studentId,
      sessionId: input.sessionId,
      status: input.status,
      reason: `${reason} (con ${input.files.length} ${input.files.length === 1 ? 'imagen' : 'imágenes'} de respaldo)`,
    });
    const justification = await this.justifications.create({
      moduleId: module.id,
      studentId: input.studentId,
      sessionId: input.sessionId,
      origin: 'ADMIN',
      reason,
      status: 'APPROVED',
      resolvedStatus: input.status,
      reviewedBy: admin.id,
      now: this.clock.now(),
      files: input.files,
    });
    return { record, justification };
  }

  async approve(admin: AuthUser, id: number, input: { status: StoredAttendanceStatus; comment?: string }) {
    if (!APPROVAL_STATUSES.includes(input.status)) {
      throw new BusinessRuleError('Para aprobar elige Presente, Atraso o Justificado');
    }
    const justification = await this.findPendingInActiveModule(id);
    const student = await this.students.findById(justification.studentId);
    const comment = input.comment?.trim() || null;

    await this.updateAttendance.execute(admin, {
      studentId: justification.studentId,
      sessionId: justification.sessionId,
      status: input.status,
      reason: `Justificación aprobada: ${justification.reason}${comment ? ` — ${comment}` : ''}`,
      allowSame: true,
    });
    const resolved = await this.justifications.resolve(id, {
      status: 'APPROVED',
      resolvedStatus: input.status,
      comment,
      adminId: admin.id,
      now: this.clock.now(),
    });
    if (!resolved) throw new ConflictError('Otro administrador ya resolvió esta justificación');

    await this.activity.record({
      actor: admin,
      action: 'APPROVE_JUSTIFICATION',
      moduleId: justification.moduleId,
      studentId: justification.studentId,
      entity: 'justification',
      entityId: id,
      description: `Aprobó la justificación de ${student?.fullName ?? 'un estudiante'} como ${STATUS_LABELS[input.status]}`,
      details: { sessionId: justification.sessionId, status: input.status, comment },
    });
    await this.notifier.toStudents({
      moduleId: justification.moduleId,
      studentId: justification.studentId,
      type: 'JUSTIFICATION_APPROVED',
      title: `Tu justificación fue aprobada: quedas como ${STATUS_LABELS[input.status]}`,
      body: comment ? `Comentario del docente: ${comment}` : null,
      link: '/estudiante',
    });
    return resolved;
  }

  async reject(admin: AuthUser, id: number, comment: string) {
    const clean = comment.trim();
    if (!clean) throw new BusinessRuleError('Explica al estudiante por qué se rechaza');
    const justification = await this.findPendingInActiveModule(id);
    const student = await this.students.findById(justification.studentId);
    const resolved = await this.justifications.resolve(id, {
      status: 'REJECTED',
      resolvedStatus: null,
      comment: clean,
      adminId: admin.id,
      now: this.clock.now(),
    });
    if (!resolved) throw new ConflictError('Otro administrador ya resolvió esta justificación');

    await this.activity.record({
      actor: admin,
      action: 'REJECT_JUSTIFICATION',
      moduleId: justification.moduleId,
      studentId: justification.studentId,
      entity: 'justification',
      entityId: id,
      description: `Rechazó la justificación de ${student?.fullName ?? 'un estudiante'}`,
      details: { sessionId: justification.sessionId, comment: clean },
    });
    await this.notifier.toStudents({
      moduleId: justification.moduleId,
      studentId: justification.studentId,
      type: 'JUSTIFICATION_REJECTED',
      title: 'Tu justificación fue rechazada',
      body: `Comentario del docente: ${clean}`,
      link: '/estudiante',
    });
    return resolved;
  }

  /** Bandeja del admin: cada justificación con el estudiante, la clase y el estado actual de la asistencia. */
  async list(filters: { moduleId?: number; status?: JustificationStatus; studentId?: number }) {
    const module = await this.activeModule.resolve(filters.moduleId);
    const [items, students, sessions, attendances] = await Promise.all([
      this.justifications.list({ moduleId: module.id, status: filters.status, studentId: filters.studentId }),
      this.students.findByModule(module.id, undefined, true),
      this.sessions.findByModule(module.id),
      this.attendances.findByModule(module.id),
    ]);
    const context = recordContextFor(module, this.clock);
    const studentById = new Map(students.map((s) => [s.id, s]));
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const attendanceByKey = new Map(attendances.map((a) => [`${a.studentId}:${a.sessionId}`, a]));

    return {
      pending: await this.justifications.countPending(module.id),
      items: items.map((j) => {
        const session = sessionById.get(j.sessionId)!;
        const student = studentById.get(j.studentId)!;
        return {
          ...j,
          student: { id: student.id, fullName: student.fullName, registrationNumber: student.registrationNumber },
          session: { id: session.id, date: session.classDate, startTime: session.startTime, endTime: session.endTime },
          currentStatus: buildRecord(session, attendanceByKey.get(`${j.studentId}:${j.sessionId}`), context).status,
        };
      }),
    };
  }

  /** Justificaciones del propio estudiante (para mostrarlas en su historial). */
  async listMine(user: AuthUser): Promise<Justification[]> {
    const { module, student } = await this.studentContext.resolve(user);
    return this.justifications.list({ moduleId: module.id, studentId: student.id });
  }

  /** Imagen de una justificación: el admin ve todas; el estudiante, solo las suyas. */
  async getFile(user: AuthUser, id: number, fileId: number) {
    const justification = await this.justifications.findById(id);
    if (!justification) throw new NotFoundError('La justificación no existe');
    if (user.role === 'STUDENT' && justification.studentId !== user.id) {
      throw new ForbiddenError('No puedes ver justificaciones de otros estudiantes');
    }
    const file = await this.justifications.findFile(id, fileId);
    if (!file) throw new NotFoundError('La imagen no existe');
    return file;
  }

  private async findPendingInActiveModule(id: number) {
    const module = await this.activeModule.getActiveOrFail();
    const justification = await this.justifications.findById(id);
    if (!justification || justification.moduleId !== module.id) {
      throw new NotFoundError('La justificación no pertenece al módulo activo');
    }
    if (justification.status !== 'PENDING') throw new ConflictError('Esta justificación ya fue resuelta');
    return justification;
  }
}
