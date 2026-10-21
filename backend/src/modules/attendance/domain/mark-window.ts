import type { AttendanceRules } from '../../../shared/domain/attendance-rules';

/** Horarios (HH:mm) en los que el estudiante puede marcar una clase con reglas de puntualidad. */
export interface MarkWindow {
  opensAt: string;
  /** Hasta esta hora (inclusive) la marca es Presente. */
  onTimeUntil: string;
  /** Hasta esta hora (inclusive) la marca es Atraso; después ya no se puede marcar. */
  lateUntil: string;
}

export type MarkMoment = 'TOO_EARLY' | 'ON_TIME' | 'LATE' | 'CLOSED';

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Sin puntualidad no hay ventana: se marca durante todo el día (RF-12), salvo que el módulo pida
 * marcar solo en el horario de la clase; entonces se acepta de la hora de inicio a la de fin, siempre
 * como Presente. Con puntualidad, nada se extiende más allá del fin de la clase.
 */
export function markWindowFor(
  rules: AttendanceRules,
  session: { startTime: string; endTime: string },
): MarkWindow | null {
  if (!rules.enabled) {
    if (!rules.classHoursOnly) return null;
    return { opensAt: session.startTime.slice(0, 5), onTimeUntil: session.endTime.slice(0, 5), lateUntil: session.endTime.slice(0, 5) };
  }
  const start = toMinutes(session.startTime);
  const end = toMinutes(session.endTime);
  const lateUntil = Math.min(start + rules.lateLimitMinutes, end);
  const onTimeUntil = Math.min(start + rules.toleranceMinutes, lateUntil);
  return {
    opensAt: fromMinutes(Math.max(0, start - rules.openBeforeMinutes)),
    onTimeUntil: fromMinutes(onTimeUntil),
    lateUntil: fromMinutes(lateUntil),
  };
}

export function classifyMoment(window: MarkWindow | null, time: string): MarkMoment {
  if (!window) return 'ON_TIME';
  const now = toMinutes(time);
  if (now < toMinutes(window.opensAt)) return 'TOO_EARLY';
  if (now <= toMinutes(window.onTimeUntil)) return 'ON_TIME';
  if (now <= toMinutes(window.lateUntil)) return 'LATE';
  return 'CLOSED';
}

/** Segundos que faltan para abrir, para el fin de la tolerancia y para el cierre del registro de hoy. */
export interface MarkCountdown {
  opensInSeconds: number;
  /** null sin reglas de puntualidad: no hay tramo de Presente separado. */
  onTimeEndsInSeconds: number | null;
  closesInSeconds: number;
}

const DAY_SECONDS = 24 * 3600;

export function markCountdown(window: MarkWindow | null, secondsOfDay: number): MarkCountdown {
  // Cada minuto límite es inclusivo: la marca de las 19:20:59 todavía es Presente.
  const until = (time: string, endOfMinute: boolean) =>
    Math.max(0, (toMinutes(time) + (endOfMinute ? 1 : 0)) * 60 - secondsOfDay);
  if (!window) {
    return { opensInSeconds: 0, onTimeEndsInSeconds: null, closesInSeconds: DAY_SECONDS - secondsOfDay };
  }
  return {
    opensInSeconds: until(window.opensAt, false),
    onTimeEndsInSeconds: until(window.onTimeUntil, true),
    closesInSeconds: until(window.lateUntil, true),
  };
}
