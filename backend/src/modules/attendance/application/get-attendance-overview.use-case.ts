import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ClassSessionRepository } from '../../class-sessions/domain/class-session.repository';
import { StudentRepository } from '../../students/domain/student.repository';
import { summarize } from '../domain/attendance-summary';
import { AttendanceRepository } from '../domain/attendance.repository';
import { attendanceKey, buildRecord, recordContextFor } from './attendance-record.view';

export interface AttendanceOverviewFilters {
  /** Módulo del historial; sin él se usa el activo. */
  moduleId?: number;
  sessionId?: number;
  studentId?: number;
  search?: string;
}

/** RF-08: matriz estudiantes × fechas con totales, filtrable por fecha o estudiante. */
@Injectable()
export class GetAttendanceOverviewUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly students: StudentRepository,
    private readonly sessions: ClassSessionRepository,
    private readonly attendances: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(filters: AttendanceOverviewFilters = {}) {
    const module = await this.activeModule.resolve(filters.moduleId);
    const context = recordContextFor(module, this.clock);
    const today = context.today;
    const [allStudents, allSessions, attendances] = await Promise.all([
      this.students.findByModule(module.id, filters.search?.trim() || undefined),
      this.sessions.findByModule(module.id),
      this.attendances.findByModule(module.id),
    ]);

    const students = filters.studentId
      ? allStudents.filter((s) => s.id === filters.studentId)
      : allStudents;
    const sessions = filters.sessionId
      ? allSessions.filter((s) => s.id === filters.sessionId)
      : allSessions;
    const byKey = new Map(attendances.map((a) => [attendanceKey(a.studentId, a.sessionId), a]));

    const rows = students.map((student) => {
      const records = sessions.map((session) =>
        buildRecord(session, byKey.get(attendanceKey(student.id, session.id)), context),
      );
      return { student, records, summary: summarize(records.map((r) => r.status), module.rules) };
    });

    const sessionTotals = sessions.map((session, index) => ({
      sessionId: session.id,
      date: session.classDate,
      ...summarize(
        rows.map((row) => row.records[index].status),
        module.rules,
      ),
    }));

    return {
      module: { id: module.id, name: module.name, status: module.status },
      extraFields: module.extraFields,
      today,
      rules: module.rules,
      sessions,
      rows,
      sessionTotals,
      totals: summarize(
        rows.flatMap((row) => row.records.map((r) => r.status)),
        module.rules,
      ),
      atRiskCount: rows.filter((row) => row.summary.atRisk).length,
    };
  }
}

export type AttendanceOverview = Awaited<ReturnType<GetAttendanceOverviewUseCase['execute']>>;
