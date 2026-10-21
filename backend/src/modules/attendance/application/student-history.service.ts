import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AcademicModule } from '../../academic-modules/domain/academic-module';
import { ClassSessionRepository } from '../../class-sessions/domain/class-session.repository';
import type { Student } from '../../students/domain/student';
import { summarize } from '../domain/attendance-summary';
import { AttendanceRepository } from '../domain/attendance.repository';
import { classifyMoment, markCountdown, markWindowFor } from '../domain/mark-window';
import { buildRecord, recordContextFor } from './attendance-record.view';

/**
 * RF-05: historial de un estudiante con resumen y estado del registro de hoy.
 * Lo usan el propio estudiante y el administrador (detalle por estudiante).
 */
@Injectable()
export class StudentHistoryService {
  constructor(
    private readonly sessions: ClassSessionRepository,
    private readonly attendances: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  /** `student`: el propio estudiante solo ve los campos adicionales marcados como visibles. */
  async build(module: AcademicModule, student: Student, audience: 'student' | 'admin') {
    const fields = module.extraFields.filter((f) => audience === 'admin' || f.visibleToStudent);
    const extra = Object.fromEntries(fields.filter((f) => student.extra[f.key]).map((f) => [f.key, student.extra[f.key]]));
    const context = recordContextFor(module, this.clock);
    const today = context.today;
    const isActive = module.status === 'ACTIVE';
    const [sessions, attendances] = await Promise.all([
      this.sessions.findByModule(module.id),
      this.attendances.findByStudent(student.id),
    ]);
    const bySession = new Map(attendances.map((a) => [a.sessionId, a]));
    const records = sessions.map((s) => buildRecord(s, bySession.get(s.id), context));
    const todayRecord = records.find((r) => r.date === today) ?? null;
    const todaySession = sessions.find((s) => s.classDate === today);
    const markWindow = todaySession ? markWindowFor(module.rules, todaySession) : null;
    const moment = classifyMoment(markWindow, context.time);
    const pending = isActive && todayRecord?.status === 'PENDIENTE';

    return {
      module: { id: module.id, name: module.name, status: module.status },
      student: { ...student, extra },
      /** Campos adicionales con su nombre, en el orden definido para el módulo. */
      extraFields: fields,
      today,
      rules: module.rules,
      markWindow,
      /** Solo mientras hoy se puede (o se podrá) marcar. */
      countdown: pending ? markCountdown(markWindow, this.clock.secondsSinceMidnight()) : null,
      todayRecord,
      canMarkToday: pending && moment !== 'TOO_EARLY',
      /** Si el docente ya publicó el código de la clase de hoy (nunca se envía el código). */
      todayCodePublished: Boolean(todaySession?.classCode),
      records,
      summary: summarize(
        records.map((r) => r.status),
        module.rules,
      ),
    };
  }
}
