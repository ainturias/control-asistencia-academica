import {
  AttendanceRules,
  DEFAULT_ATTENDANCE_RULES,
} from '../../../shared/domain/attendance-rules';
import type { AttendanceDisplayStatus } from './attendance-status';

type Scoring = Pick<AttendanceRules, 'presentPoints' | 'latePoints' | 'minAttendancePercentage'>;

export interface AttendanceSummary {
  total: number;
  presentes: number;
  atrasos: number;
  faltas: number;
  justificados: number;
  pendientes: number;
  programadas: number;
  /** Sesiones con estado final (presente, atraso, falta o justificada). */
  completed: number;
  /** Puntos obtenidos y posibles sobre las sesiones evaluadas; las justificadas no suman al máximo. */
  points: number;
  maxPoints: number;
  /**
   * Porcentaje de asistencia (presentes + atrasos) sobre las fechas evaluadas.
   * Las justificadas no cuentan a favor ni en contra. null si aún no hay ninguna evaluada.
   */
  percentage: number | null;
  /** Por debajo del mínimo de asistencia del módulo. */
  atRisk: boolean;
}

/** Puntos de una sesión; null si todavía no se evalúa o está justificada. */
export function pointsFor(status: AttendanceDisplayStatus, scoring: Scoring): number | null {
  if (status === 'PRESENTE') return scoring.presentPoints;
  if (status === 'ATRASO') return scoring.latePoints;
  if (status === 'FALTA') return 0;
  return null;
}

export function summarize(
  statuses: AttendanceDisplayStatus[],
  scoring: Scoring = DEFAULT_ATTENDANCE_RULES,
): AttendanceSummary {
  // Las clases canceladas no forman parte del módulo para el resumen.
  statuses = statuses.filter((s) => s !== 'CANCELADA');
  const summary: AttendanceSummary = {
    total: statuses.length,
    presentes: 0,
    atrasos: 0,
    faltas: 0,
    justificados: 0,
    pendientes: 0,
    programadas: 0,
    completed: 0,
    points: 0,
    maxPoints: 0,
    percentage: null,
    atRisk: false,
  };
  for (const status of statuses) {
    if (status === 'PRESENTE') summary.presentes++;
    else if (status === 'ATRASO') summary.atrasos++;
    else if (status === 'FALTA') summary.faltas++;
    else if (status === 'JUSTIFICADO') summary.justificados++;
    else if (status === 'PENDIENTE') summary.pendientes++;
    else summary.programadas++;

    const points = pointsFor(status, scoring);
    if (points !== null) {
      summary.points += points;
      summary.maxPoints += scoring.presentPoints;
    }
  }
  const attended = summary.presentes + summary.atrasos;
  const evaluated = attended + summary.faltas;
  summary.completed = evaluated + summary.justificados;
  if (evaluated > 0) {
    summary.percentage = Math.round((attended / evaluated) * 100);
    summary.atRisk = summary.percentage < scoring.minAttendancePercentage;
  }
  return summary;
}
