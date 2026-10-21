import { env } from '../../../core/config/env'

/** Una fecha de clase, venga de /sessions (admin) o del historial del estudiante. */
export interface CalendarSession {
  classDate: string
  startTime: string
  endTime: string
  /** CANCELLED: se muestra tachada y no cuenta en totales ni en el horario. */
  status?: 'SCHEDULED' | 'CANCELLED'
  isMakeup?: boolean
}

export const WEEKDAYS_SHORT = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export const todayIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )

/** Día de la semana con lunes = 0. */
const weekdayOf = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** Agrupa las clases por horario: "lunes, miércoles y viernes · 19:00 – 22:00". */
export function scheduleOf(sessions: CalendarSession[]) {
  const groups = new Map<string, Set<number>>()
  for (const s of sessions) {
    const key = `${s.startTime} – ${s.endTime}`
    if (!groups.has(key)) groups.set(key, new Set())
    groups.get(key)!.add(weekdayOf(s.classDate))
  }
  return [...groups].map(([hours, days]) => ({ hours, days: joinWords([...days].sort().map((d) => WEEKDAYS_LONG[d])) }))
}

const joinWords = (words: string[]) =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} y ${words[words.length - 1]}`

/** Meses (año, mes 0-11) entre la primera y la última clase. */
export function monthsBetween(first: string, last: string) {
  const [fy, fm] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)
  const months: { year: number; month: number }[] = []
  for (let y = fy, m = fm - 1; y < ly || (y === ly && m <= lm - 1); m === 11 ? (y++, (m = 0)) : m++) {
    months.push({ year: y, month: m })
  }
  return months
}


const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  )
}

/** Texto para acompañar la imagen al compartir (WhatsApp, correo…). */
export function calendarSummaryText({
  moduleName,
  sessions,
  teacherName,
}: {
  moduleName: string
  sessions: CalendarSession[]
  teacherName: string | null
}) {
  const first = sessions[0].classDate
  const last = sessions[sessions.length - 1].classDate
  // Sin emojis: algunas versiones de WhatsApp y del correo los muestran como "?".
  const lines = [
    `*Calendario de clases del módulo: ${moduleName}*`,
    ...(teacherName ? [`- Docente: ${teacherName}`] : []),
    `- Inicio: ${longDate(first)}`,
    `- Fin: ${longDate(last)}`,
    ...scheduleOf(sessions).map((s) => `- Clases: ${s.days}, ${s.hours.replace(' – ', ' a ')}`),
    `- Fechas (${sessions.length}): ${sessions.map((s) => shortDate(s.classDate)).join(', ')}`,
  ]
  return lines.join('\n')
}
