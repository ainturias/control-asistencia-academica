import type { AttendanceRules } from '../../../shared/domain/attendance-rules';
import { BusinessRuleError, ConflictError } from '../../../shared/domain/errors';
import type { Attendance } from './attendance';
import {
  AttendanceDisplayStatus,
  BASIC_STATUSES,
  StoredAttendanceStatus,
} from './attendance-status';
import { classifyMoment, MarkWindow } from './mark-window';

/**
 * RN-03 / RN-04: el estudiante solo marca el día de la clase y una única vez.
 * La sesión ya fue buscada por la fecha de hoy, así que `hasSessionToday` cubre RN-04.
 */
export function ensureStudentCanMark(hasSessionToday: boolean, existing: Attendance | null): void {
  if (!hasSessionToday) {
    throw new BusinessRuleError(
      'Hoy no hay clase programada. Solo puedes marcar asistencia en las fechas de clase.',
    );
  }
  if (existing) {
    throw new ConflictError(
      existing.source === 'STUDENT'
        ? 'Ya registraste tu asistencia de hoy'
        : 'El administrador ya registró tu asistencia de hoy',
    );
  }
}

/**
 * Código de clase (opcional por módulo): el estudiante escribe el que dio el docente.
 * Se compara sin distinguir mayúsculas ni espacios.
 */
export function ensureClassCode(required: boolean, expected: string | null, given: string | undefined): void {
  if (!required) return;
  if (!expected) {
    throw new BusinessRuleError('El docente todavía no publicó el código de esta clase. Espera a que lo indique.');
  }
  const normalize = (code: string) => code.replace(/\s+/g, '').toUpperCase();
  if (!given?.trim()) throw new BusinessRuleError('Escribe el código de la clase que te dio el docente');
  if (normalize(given) !== normalize(expected)) {
    throw new BusinessRuleError('El código de la clase no es correcto');
  }
}

/** Estado que corresponde a una marca del estudiante según la hora; sin reglas siempre es Presente. */
export function statusForStudentMark(window: MarkWindow | null, time: string): StoredAttendanceStatus {
  switch (classifyMoment(window, time)) {
    case 'ON_TIME':
      return 'PRESENTE';
    case 'LATE':
      return 'ATRASO';
    case 'TOO_EARLY':
      throw new BusinessRuleError(`Todavía no puedes marcar. El registro se habilita a las ${window!.opensAt}.`);
    case 'CLOSED':
      throw new BusinessRuleError(
        `El tiempo para marcar terminó a las ${window!.lateUntil}. Consulta con tu administrador.`,
      );
  }
}

/** RN-06 / RN-07: el admin puede cambiar cualquier fecha, pero el cambio debe ser real. */
export function ensureAdminChangeIsEffective(
  current: AttendanceDisplayStatus,
  next: StoredAttendanceStatus,
): void {
  if (current === next) {
    throw new BusinessRuleError(`La asistencia ya figura como ${next}`);
  }
}

/** Atraso solo existe con las reglas de puntualidad activas. */
export function ensureStatusAllowed(rules: AttendanceRules, status: StoredAttendanceStatus): void {
  if (!rules.enabled && !BASIC_STATUSES.includes(status)) {
    throw new BusinessRuleError(
      'Activa las reglas de puntualidad del módulo para usar el estado Atraso',
    );
  }
}
