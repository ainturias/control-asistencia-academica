import { env } from '../../../core/config/env'

const longDateTime = new Intl.DateTimeFormat('es-BO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: env.timeZone,
})

/** "Lunes, 3 de noviembre de 2026, 00:00" */
export const formatScheduled = (instant: string) => {
  const text = longDateTime.format(new Date(instant))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "en 3 días", "en 5 horas"… */
export function relativeFromNow(instant: string) {
  const minutes = Math.round((new Date(instant).getTime() - Date.now()) / 60_000)
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(minutes) < 60 * 24) return rtf.format(Math.round(minutes / 60), 'hour')
  return rtf.format(Math.round(minutes / (60 * 24)), 'day')
}

/** Valor para <input type="datetime-local"> en la hora local del navegador. */
export function toLocalInput(instant: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}T${pad(instant.getHours())}:${pad(instant.getMinutes())}`
}
