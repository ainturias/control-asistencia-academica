import { env } from '../../core/config/env'

/** Las fechas de clase vienen como YYYY-MM-DD; se formatean sin desfase de zona horaria. */
function fromIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

const longDate = new Intl.DateTimeFormat('es-BO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const shortDate = new Intl.DateTimeFormat('es-BO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})
const numericDate = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const time = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: env.timeZone,
})
const dateTime = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: env.timeZone,
})

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const formatLongDate = (isoDate: string) => capitalize(longDate.format(fromIsoDate(isoDate)))
export const formatShortDate = (isoDate: string) => shortDate.format(fromIsoDate(isoDate)).replace(/\./g, '')
export const formatDate = (isoDate: string) => numericDate.format(fromIsoDate(isoDate))
export const formatTime = (instant: string) => time.format(new Date(instant))
export const formatDateTime = (instant: string) => dateTime.format(new Date(instant))
