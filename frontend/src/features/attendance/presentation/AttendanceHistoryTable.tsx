import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate, formatTime } from '../../../shared/lib/format'
import { isAttended, type AttendanceRecord } from '../domain/attendance'
import { StatusChip } from './StatusChip'

type View = 'ALL' | 'UNTIL_TODAY' | 'MONTH' | 'WEEK'

const VIEWS: { value: View; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'UNTIL_TODAY', label: 'Hasta hoy' },
  { value: 'MONTH', label: 'Mensual' },
  { value: 'WEEK', label: 'Semanal' },
]

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const toIso = (date: Date) => date.toISOString().slice(0, 10)

/** Lunes de la semana de la fecha dada. */
const mondayOf = (iso: string) => {
  const date = toDate(iso)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return toIso(date)
}
const addDays = (iso: string, days: number) => {
  const date = toDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}
const addMonths = (month: string, months: number) => {
  const date = toDate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return toIso(date).slice(0, 7)
}

const monthLabel = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function observation(record: AttendanceRecord) {
  if (record.source === 'STUDENT') {
    return record.markedAt ? `Autograbado · ${formatTime(record.markedAt)}` : 'Autograbado'
  }
  if (record.source === 'ADMIN') {
    return record.adminNote ? `Administrador: ${record.adminNote}` : 'Registrado por el administrador'
  }
  if (record.status === 'FALTA') return 'Sin marca'
  if (record.status === 'CANCELADA') return 'Clase cancelada'
  return ''
}

const score = (record: AttendanceRecord) =>
  record.status === 'JUSTIFICADO' || record.status === 'CANCELADA' ? '—' : `${record.points ?? '?'} / ${record.maxPoints}`

/**
 * Historial al estilo del aula virtual: filtros por periodo, puntuación por sesión
 * y resumen de sesiones, puntos y porcentaje del periodo mostrado.
 */
export function AttendanceHistoryTable({
  records,
  today,
  onEdit,
  renderExtra,
}: {
  records: AttendanceRecord[]
  today: string
  /** Si se pasa, cada estado se puede modificar (administrador). */
  onEdit?: (record: AttendanceRecord) => void
  /** Contenido adicional por sesión en Observaciones (p. ej. justificaciones). */
  renderExtra?: (record: AttendanceRecord) => ReactNode
}) {
  const [view, setView] = useState<View>('ALL')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [week, setWeek] = useState(mondayOf(today))

  const visible = records.filter((r) => {
    if (view === 'UNTIL_TODAY') return r.date <= today
    if (view === 'MONTH') return r.date.startsWith(month)
    if (view === 'WEEK') return r.date >= week && r.date <= addDays(week, 6)
    return true
  })

  // Las clases canceladas no forman parte del total.
  const countable = visible.filter((r) => r.status !== 'CANCELADA')
  const completed = visible.filter((r) => r.points !== null || r.status === 'JUSTIFICADO')
  const scored = visible.filter((r) => r.points !== null)
  const points = scored.reduce((sum, r) => sum + (r.points ?? 0), 0)
  const maxPoints = scored.reduce((sum, r) => sum + r.maxPoints, 0)
  const attended = scored.filter((r) => isAttended(r.status)).length
  const percentage = scored.length ? Math.round((attended / scored.length) * 100) : null

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-9">
          {view === 'MONTH' && (
            <PeriodNav
              label={monthLabel.format(toDate(`${month}-01`))}
              onPrev={() => setMonth(addMonths(month, -1))}
              onNext={() => setMonth(addMonths(month, 1))}
            />
          )}
          {view === 'WEEK' && (
            <PeriodNav
              label={`${dayMonth.format(toDate(week))} – ${dayMonth.format(toDate(addDays(week, 6)))}`}
              onPrev={() => setWeek(addDays(week, -7))}
              onNext={() => setWeek(addDays(week, 7))}
            />
          )}
        </div>
        <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
          {VIEWS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
                view === value ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">No hay sesiones de clase en este periodo.</p>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted uppercase">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-center">Puntuación</th>
                  <th className="px-5 py-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((record) => (
                  <tr key={record.sessionId} className={cn(record.date === today && 'bg-brand-soft/40')}>
                    <td className="px-5 py-3">
                      <p className="font-semibold capitalize">
                        {formatShortDate(record.date)}
                        {record.date === today && <span className="ml-2 text-xs font-bold text-brand uppercase">Hoy</span>}
                      </p>
                      <p className="text-muted tabular-nums">
                        {record.startTime} – {record.endTime}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted">Sesión de clase</td>
                    <td className="px-5 py-3">
                      <StatusCell record={record} onEdit={onEdit} />
                    </td>
                    <td className="px-5 py-3 text-center font-semibold tabular-nums">{score(record)}</td>
                    <td className="max-w-xs px-5 py-3 text-muted">
                      {observation(record)}
                      {renderExtra && <div className="mt-1.5 empty:hidden">{renderExtra(record)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((record) => (
              <li key={record.sessionId} className={cn('space-y-2 px-5 py-3.5', record.date === today && 'bg-brand-soft/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">
                      {formatShortDate(record.date)}
                      {record.date === today && <span className="ml-2 text-xs font-bold text-brand uppercase">Hoy</span>}
                    </p>
                    <p className="text-sm text-muted tabular-nums">
                      {record.startTime} – {record.endTime}
                    </p>
                  </div>
                  <StatusCell record={record} onEdit={onEdit} />
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">{observation(record) || 'Sesión de clase'}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{score(record)}</span>
                </div>
                {renderExtra && <div className="empty:hidden">{renderExtra(record)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      <dl className="grid gap-x-6 gap-y-1 border-t border-line bg-canvas/60 px-5 py-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Sesiones registradas</dt>
          <dd className="font-bold">
            {completed.length} de {countable.length}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Puntos sobre las sesiones completadas</dt>
          <dd className="font-bold tabular-nums">
            {points} / {maxPoints}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Porcentaje sobre las sesiones completadas</dt>
          <dd className="font-bold tabular-nums">{percentage === null ? '—' : `${percentage}%`}</dd>
        </div>
      </dl>
    </div>
  )
}

function StatusCell({ record, onEdit }: { record: AttendanceRecord; onEdit?: (record: AttendanceRecord) => void }) {
  if (!onEdit) return <StatusChip status={record.status} />
  return (
    <button
      type="button"
      onClick={() => onEdit(record)}
      className="rounded-full transition hover:ring-2 hover:ring-brand/30"
      title="Modificar asistencia"
    >
      <StatusChip status={record.status} />
    </button>
  )
}

function PeriodNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Anterior">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-36 text-center text-sm font-semibold first-letter:uppercase">{label}</span>
      <button type="button" onClick={onNext} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Siguiente">
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
