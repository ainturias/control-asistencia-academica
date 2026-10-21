import type { AttendanceRules } from './academic-module'

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Misma regla que el servidor: ventana de marca a partir de la hora de inicio, sin pasar del fin de la clase. */
export function markWindowFor(rules: AttendanceRules, startTime: string, endTime: string) {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const lateUntil = Math.min(start + rules.lateLimitMinutes, end)
  const onTimeUntil = Math.min(start + rules.toleranceMinutes, lateUntil)
  const opensAt = Math.max(0, start - rules.openBeforeMinutes)
  return { opensAt, start, onTimeUntil, lateUntil, end }
}
