import { BusinessRuleError } from './errors';

/**
 * Reglas de asistencia del módulo. La puntualidad (`enabled`) es una extensión opcional de RF-12:
 * apagada, la marca se permite todo el día de clase y siempre es Presente.
 * Los puntos y el mínimo de asistencia aplican siempre.
 */
export interface AttendanceRules {
  enabled: boolean;
  /** Minutos antes del inicio de la clase en que se habilita la marca. */
  openBeforeMinutes: number;
  /** Minutos después del inicio en que la marca todavía cuenta como Presente. */
  toleranceMinutes: number;
  /** Minutos después del inicio hasta los que se acepta la marca como Atraso. */
  lateLimitMinutes: number;
  /** Puntos de una sesión con Presente (también es el máximo por sesión). */
  presentPoints: number;
  /** Puntos de una sesión con Atraso. */
  latePoints: number;
  /** Por debajo de este porcentaje el estudiante queda en riesgo. */
  minAttendancePercentage: number;
  /**
   * Días después de la clase en que el estudiante puede enviar una justificación.
   * 0 = los estudiantes no pueden enviarlas (el admin igual puede corregir con pruebas).
   */
  justificationDays: number;
  /** El estudiante debe escribir el código de la clase que da el docente para poder marcar. */
  requireClassCode: boolean;
  /**
   * Sin puntualidad: la marca solo se acepta entre la hora de inicio y la de fin de cada clase
   * (siempre como Presente), en vez de todo el día. Extensión opcional de RF-12, apagada por defecto.
   */
  classHoursOnly: boolean;
}

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  enabled: false,
  openBeforeMinutes: 15,
  toleranceMinutes: 20,
  lateLimitMinutes: 60,
  presentPoints: 2,
  latePoints: 1,
  minAttendancePercentage: 80,
  justificationDays: 3,
  requireClassCode: false,
  classHoursOnly: false,
};

export function ensureValidRules(rules: AttendanceRules): void {
  if (rules.toleranceMinutes > rules.lateLimitMinutes) {
    throw new BusinessRuleError(
      'La tolerancia para Presente no puede ser mayor que el límite de Atraso',
    );
  }
  if (rules.latePoints > rules.presentPoints) {
    throw new BusinessRuleError('Un Atraso no puede valer más puntos que un Presente');
  }
}
