/** Clase con fecha y hora de inicio (del módulo activo o del borrador nuevo). */
interface TimedClass {
  date: string
  startTime: string
}

export interface ScheduleConflicts {
  /** Clases del módulo activo que todavía no ocurrieron al momento de la activación: no se dictarían. */
  activeRemaining: { count: number; first: string; last: string } | null
  /** Clases del módulo nuevo anteriores a su activación: quedarían como falta. */
  newBefore: { count: number; first: string; last: string } | null
  /**
   * Fecha y hora sugerida (valor de <input type="datetime-local">) que no choca: el día siguiente a la
   * última clase del módulo activo, si es antes de la primera clase del nuevo. null si no hay una posible.
   */
  suggestion: string | null
  /** Último día de clase del módulo activo (para explicar el aviso). */
  activeLast: string | null
}

const nextDay = (iso: string) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Compara el momento de activación programada (`activation`, formato AAAA-MM-DDTHH:mm en hora local)
 * con las clases del módulo activo y las del módulo nuevo. Las cadenas ISO se comparan como texto.
 */
export function scheduleConflicts(activation: string, activeClasses: TimedClass[], newClasses: TimedClass[]): ScheduleConflicts {
  const at = (c: TimedClass) => `${c.date}T${c.startTime}`
  const sortedActive = [...activeClasses].sort((a, b) => at(a).localeCompare(at(b)))
  const sortedNew = [...newClasses].sort((a, b) => at(a).localeCompare(at(b)))

  const remaining = sortedActive.filter((c) => at(c) >= activation)
  const before = sortedNew.filter((c) => at(c) < activation)
  const activeLast = sortedActive.length ? sortedActive[sortedActive.length - 1].date : null
  const newFirst = sortedNew.length ? at(sortedNew[0]) : null
  const candidate = activeLast ? `${nextDay(activeLast)}T00:00` : null

  return {
    activeRemaining: remaining.length
      ? { count: remaining.length, first: remaining[0].date, last: remaining[remaining.length - 1].date }
      : null,
    newBefore: before.length ? { count: before.length, first: before[0].date, last: before[before.length - 1].date } : null,
    suggestion: candidate && (!newFirst || candidate <= newFirst) ? candidate : null,
    activeLast,
  }
}
