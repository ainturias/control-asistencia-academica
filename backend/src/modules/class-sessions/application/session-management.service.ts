import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { toDisplayDate } from '../../../shared/domain/display-date';
import { BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/domain/errors';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { Notifier } from '../../notifications/application/notifier.service';
import type { UploadedImage } from '../../justifications/domain/justification';
import { ensureValidImages, ensureValidReason } from '../../justifications/domain/justification-policy';
import type { ClassSession } from '../domain/class-session';
import { ClassSessionRepository, SessionData } from '../domain/class-session.repository';
import { MAX_CHANGE_PHOTOS, type SessionChangeAction, type SessionSnapshot } from '../domain/session-change';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const CODE = /^[A-Za-z0-9]{4,8}$/;

export interface ChangeInput {
  reason: string;
  files: UploadedImage[];
}

const snapshot = (s: ClassSession): SessionSnapshot => ({ date: s.classDate, startTime: s.startTime, endTime: s.endTime });

/** Fecha y horario válidos para una clase nueva o reprogramada (no en el pasado). */
export function ensureValidSessionData(data: SessionData, today: string): void {
  const date = ISO_DATE.test(data.classDate) ? new Date(`${data.classDate}T12:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.classDate) {
    throw new ValidationError('La fecha no es válida');
  }
  if (data.classDate < today) throw new BusinessRuleError('La fecha no puede ser anterior a hoy');
  if (!HH_MM.test(data.startTime) || !HH_MM.test(data.endTime)) throw new ValidationError('Las horas deben tener el formato HH:MM');
  if (data.startTime >= data.endTime) throw new BusinessRuleError('La hora de fin debe ser posterior a la de inicio');
}

/** Código de clase: de 4 a 8 letras o números. */
export function normalizeClassCode(code: string): string {
  const clean = code.replace(/\s+/g, '').toUpperCase();
  if (!CODE.test(clean)) throw new ValidationError('El código debe tener de 4 a 8 letras o números');
  return clean;
}

/**
 * Cambios en las fechas del módulo activo: cancelar, restaurar, reprogramar o agregar una clase de
 * recuperación. Cada cambio guarda motivo y hasta 3 fotos, y lo ven el admin y los estudiantes.
 */
@Injectable()
export class SessionManagementService {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly sessions: ClassSessionRepository,
    private readonly activity: ActivityRecorder,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  async cancel(admin: AuthUser, sessionId: number, input: ChangeInput) {
    const { module, session } = await this.findInActiveModule(sessionId);
    if (session.status === 'CANCELLED') throw new BusinessRuleError('Esa clase ya está cancelada');
    const reason = this.validate(input);
    const updated = await this.sessions.setStatus(session.id, 'CANCELLED');
    return this.finish(admin, module.id, updated, 'CANCEL', snapshot(session), null, reason, input.files,
      `Canceló la clase del ${toDisplayDate(session.classDate)}`);
  }

  async restore(admin: AuthUser, sessionId: number, input: ChangeInput) {
    const { module, session } = await this.findInActiveModule(sessionId);
    if (session.status !== 'CANCELLED') throw new BusinessRuleError('Esa clase no está cancelada');
    const reason = this.validate(input);
    const updated = await this.sessions.setStatus(session.id, 'SCHEDULED');
    return this.finish(admin, module.id, updated, 'RESTORE', null, snapshot(session), reason, input.files,
      `Restauró la clase del ${toDisplayDate(session.classDate)}`);
  }

  async reschedule(admin: AuthUser, sessionId: number, data: SessionData, input: ChangeInput) {
    const { module, session } = await this.findInActiveModule(sessionId);
    if (session.status === 'CANCELLED') throw new BusinessRuleError('Restaura la clase antes de reprogramarla');
    if ((await this.sessions.countAttendances(session.id)) > 0) {
      throw new BusinessRuleError(
        'Esa clase ya tiene asistencias registradas. Cancélala y agrega una clase de recuperación.',
      );
    }
    ensureValidSessionData(data, this.clock.today());
    if (data.classDate === session.classDate && data.startTime === session.startTime && data.endTime === session.endTime) {
      throw new BusinessRuleError('La nueva fecha y horario son iguales a los actuales');
    }
    const reason = this.validate(input);
    const updated = await this.sessions.update(session.id, data);
    return this.finish(admin, module.id, updated, 'RESCHEDULE', snapshot(session), snapshot(updated), reason, input.files,
      `Reprogramó la clase del ${toDisplayDate(session.classDate)} al ${toDisplayDate(updated.classDate)}`);
  }

  async add(admin: AuthUser, data: SessionData, input: ChangeInput) {
    const module = await this.activeModule.getActiveOrFail();
    ensureValidSessionData(data, this.clock.today());
    const reason = this.validate(input);
    const created = await this.sessions.create(module.id, data, true);
    return this.finish(admin, module.id, created, 'ADD', null, snapshot(created), reason, input.files,
      `Agregó una clase de recuperación el ${toDisplayDate(created.classDate)}`);
  }

  /** Publica o quita el código que los estudiantes deben escribir para marcar en esa clase. */
  async setCode(admin: AuthUser, sessionId: number, code: string | null) {
    const { module, session } = await this.findInActiveModule(sessionId);
    const clean = code === null || code.trim() === '' ? null : normalizeClassCode(code);
    const updated = await this.sessions.setCode(session.id, clean);
    if (clean) {
      await this.notifier.toStudents({
        moduleId: module.id,
        type: 'CLASS_CODE_PUBLISHED',
        title: `Hay código de asistencia para la clase del ${toDisplayDate(session.classDate)}`,
        body: 'Pídeselo a tu docente durante la clase (por ejemplo, en el chat) y escríbelo al marcar tu asistencia.',
        link: '/estudiante',
      });
    }
    // El código en sí no se guarda en el historial para que no quede expuesto.
    await this.activity.record({
      actor: admin,
      action: 'SET_CLASS_CODE',
      moduleId: module.id,
      entity: 'session',
      entityId: session.id,
      description: clean
        ? `Publicó el código de la clase del ${toDisplayDate(session.classDate)}`
        : `Quitó el código de la clase del ${toDisplayDate(session.classDate)}`,
    });
    return updated;
  }

  /** Historial de cambios: el admin ve cualquier módulo; el estudiante, solo el suyo activo. */
  async listChanges(user: AuthUser, moduleId?: number) {
    if (user.role === 'STUDENT' && moduleId !== undefined) throw new ForbiddenError('Sin acceso a otros módulos');
    const module = await this.activeModule.resolve(moduleId);
    if (user.role === 'STUDENT' && user.moduleId !== module.id) throw new ForbiddenError('Sin acceso a este módulo');
    return this.sessions.listChanges(module.id);
  }

  async getChangeFile(user: AuthUser, changeId: number, fileId: number) {
    const file = await this.sessions.findChangeFile(changeId, fileId);
    if (!file) throw new NotFoundError('La imagen no existe');
    if (user.role === 'STUDENT' && user.moduleId !== file.moduleId) throw new ForbiddenError('Sin acceso a esta imagen');
    return file;
  }

  private validate(input: ChangeInput) {
    ensureValidImages(input.files, 0, MAX_CHANGE_PHOTOS);
    return ensureValidReason(input.reason);
  }

  private async findInActiveModule(sessionId: number) {
    const module = await this.activeModule.getActiveOrFail();
    const session = await this.sessions.findById(sessionId);
    if (!session || session.moduleId !== module.id) throw new NotFoundError('La clase no pertenece al módulo activo');
    return { module, session };
  }

  private async finish(
    admin: AuthUser,
    moduleId: number,
    session: ClassSession,
    action: SessionChangeAction,
    previous: SessionSnapshot | null,
    next: SessionSnapshot | null,
    reason: string,
    files: UploadedImage[],
    description: string,
  ) {
    const change = await this.sessions.recordChange({
      moduleId,
      sessionId: session.id,
      adminId: admin.id,
      action,
      previous,
      next,
      reason,
      now: this.clock.now(),
      files,
    });
    const activityAction = {
      CANCEL: 'CANCEL_SESSION',
      RESTORE: 'RESTORE_SESSION',
      RESCHEDULE: 'RESCHEDULE_SESSION',
      ADD: 'ADD_SESSION',
    } as const;
    await this.activity.record({
      actor: admin,
      action: activityAction[action],
      moduleId,
      entity: 'session',
      entityId: session.id,
      description: `${description}: ${reason}`,
      details: { previous, next, photos: files.length },
    });
    await this.notifier.toStudents({ moduleId, ...studentNotice(action, previous, next, reason) });
    return { session, change };
  }
}

const describe = (s: SessionSnapshot) => `${toDisplayDate(s.date)} (${s.startTime} a ${s.endTime})`;

/** Texto de la notificación que reciben los estudiantes por cada cambio de clase. */
function studentNotice(
  action: SessionChangeAction,
  previous: SessionSnapshot | null,
  next: SessionSnapshot | null,
  reason: string,
) {
  const base = { body: `Motivo: ${reason}`, link: '/estudiante/modulo' };
  switch (action) {
    case 'CANCEL':
      return { ...base, type: 'SESSION_CANCELLED' as const, title: `Clase cancelada: ${describe(previous!)}` };
    case 'RESTORE':
      return { ...base, type: 'SESSION_RESTORED' as const, title: `Clase restaurada: ${describe(next!)}` };
    case 'RESCHEDULE':
      return { ...base, type: 'SESSION_RESCHEDULED' as const, title: `Clase reprogramada: ${describe(previous!)} pasa al ${describe(next!)}` };
    case 'ADD':
      return { ...base, type: 'SESSION_ADDED' as const, title: `Nueva clase de recuperación: ${describe(next!)}` };
  }
}
