import type { Clock } from '../../../shared/application/clock.port';
import type { AttendanceRules } from '../../../shared/domain/attendance-rules';
import type { AcademicModule } from '../../academic-modules/domain/academic-module';
import type { ClassSession } from '../../class-sessions/domain/class-session';
import type { Attendance } from '../domain/attendance';
import {
  AttendanceDisplayStatus,
  AttendanceSource,
  resolveAttendanceStatus,
} from '../domain/attendance-status';
import { pointsFor } from '../domain/attendance-summary';
import { classifyMoment, markWindowFor } from '../domain/mark-window';

/** Momento actual y reglas del módulo: todo lo necesario para derivar los estados. */
export interface RecordContext {
  /** YYYY-MM-DD */
  today: string;
  /** HH:mm */
  time: string;
  rules: AttendanceRules;
}

const nextDay = (isoDate: string) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

/**
 * Momento de referencia para derivar estados. En un módulo finalizado es el día siguiente a su
 * cierre: lo anterior sin marca es Falta y lo posterior nunca se dictó (queda Programada).
 */
export function recordContextFor(module: AcademicModule, clock: Clock): RecordContext {
  if (module.status === 'CLOSED' && module.closedAt) {
    return { today: nextDay(clock.toLocalDate(module.closedAt)), time: '00:00', rules: module.rules };
  }
  return { today: clock.today(), time: clock.currentTime(), rules: module.rules };
}

/** Estado de un estudiante en una fecha de clase, listo para mostrar. */
export interface AttendanceRecordView {
  sessionId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AttendanceDisplayStatus;
  markedAt: Date | null;
  source: AttendanceSource | null;
  updatedAt: Date | null;
  /** Puntos de la sesión (null si aún no se evalúa o está justificada) sobre `maxPoints`. */
  points: number | null;
  maxPoints: number;
  /** Motivo que dio el administrador al cambiar el registro. */
  adminNote: string | null;
}

export function buildRecord(
  session: ClassSession,
  attendance: Attendance | undefined | null,
  context: RecordContext,
): AttendanceRecordView {
  const closedToday =
    session.classDate === context.today &&
    classifyMoment(markWindowFor(context.rules, session), context.time) === 'CLOSED';
  const status: AttendanceDisplayStatus =
    session.status === 'CANCELLED'
      ? 'CANCELADA'
      : resolveAttendanceStatus(attendance?.status ?? null, session.classDate, context.today, closedToday);
  return {
    sessionId: session.id,
    date: session.classDate,
    startTime: session.startTime,
    endTime: session.endTime,
    status,
    markedAt: attendance?.markedAt ?? null,
    source: attendance?.source ?? null,
    updatedAt: attendance?.updatedAt ?? null,
    points: pointsFor(status, context.rules),
    maxPoints: context.rules.presentPoints,
    adminNote: attendance?.adminNote ?? null,
  };
}

export const attendanceKey = (studentId: number, sessionId: number) => `${studentId}:${sessionId}`;
