import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { toDisplayDate } from '../../../shared/domain/display-date';
import { BusinessRuleError } from '../../../shared/domain/errors';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { Notifier } from '../../notifications/application/notifier.service';
import { ClassSessionRepository } from '../../class-sessions/domain/class-session.repository';
import { ensureClassCode, ensureStudentCanMark, statusForStudentMark } from '../domain/attendance-policy';
import { markWindowFor } from '../domain/mark-window';
import { AttendanceRepository } from '../domain/attendance.repository';
import { buildRecord } from './attendance-record.view';
import { StudentContextService } from './student-context.service';

/** RF-03: el estudiante marca su asistencia del día; con reglas de puntualidad queda Presente o Atraso. */
@Injectable()
export class MarkAttendanceUseCase {
  constructor(
    private readonly context: StudentContextService,
    private readonly sessions: ClassSessionRepository,
    private readonly attendances: AttendanceRepository,
    private readonly activity: ActivityRecorder,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  /** Intentos fallidos de código por estudiante y clase (en memoria; se reinicia con el servidor). */
  private readonly failedCodes = new Map<string, number>();

  async execute(user: AuthUser, code?: string) {
    const { module, student } = await this.context.resolve(user);
    const today = this.clock.today();
    const time = this.clock.currentTime();
    const session = await this.sessions.findByModuleAndDate(module.id, today);
    const existing = session ? await this.attendances.findOne(student.id, session.id) : null;
    ensureStudentCanMark(session !== null, existing);
    if (session!.status === 'CANCELLED') {
      throw new BusinessRuleError('La clase de hoy fue cancelada; no se registra asistencia.');
    }
    this.checkCode(module.rules.requireClassCode, session!.classCode, code, `${student.id}:${session!.id}`);
    const status = statusForStudentMark(markWindowFor(module.rules, session!), time);

    const attendance = await this.attendances.registerStudentMark({
      moduleId: module.id,
      studentId: student.id,
      sessionId: session!.id,
      status,
      markedAt: this.clock.now(),
    });

    await this.activity.record({
      actor: user,
      action: 'MARK_ATTENDANCE',
      moduleId: module.id,
      studentId: student.id,
      entity: 'attendance',
      entityId: attendance.id,
      description: `${student.fullName} marcó asistencia del ${toDisplayDate(today)}${status === 'ATRASO' ? ' (atraso)' : ''}`,
      details: { sessionId: session!.id, date: today, status },
    });

    await this.notifier.toAdmins({
      moduleId: module.id,
      type: 'ATTENDANCE_MARKED',
      title: `${student.fullName} marcó ${status === 'ATRASO' ? 'con atraso' : 'presente'}`,
      body: `Clase del ${toDisplayDate(today)} a las ${time}`,
      link: `/admin/estudiantes/${student.id}`,
    });
    return buildRecord(session!, attendance, { today, time, rules: module.rules });
  }

  /** Tras 5 códigos incorrectos en la misma clase se bloquea el intento: debe marcarlo el docente. */
  private checkCode(required: boolean, expected: string | null, given: string | undefined, key: string) {
    if (!required) return;
    if ((this.failedCodes.get(key) ?? 0) >= MAX_CODE_ATTEMPTS) {
      throw new BusinessRuleError('Demasiados intentos con un código incorrecto. Pide al docente que registre tu asistencia.');
    }
    try {
      ensureClassCode(required, expected, given);
      this.failedCodes.delete(key);
    } catch (error) {
      if (expected && given?.trim()) this.failedCodes.set(key, (this.failedCodes.get(key) ?? 0) + 1);
      throw error;
    }
  }
}

const MAX_CODE_ATTEMPTS = 5;
