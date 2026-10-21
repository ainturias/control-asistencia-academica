import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Pencil,
  Percent,
  Search,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatLongDate, formatShortDate, formatTime } from '../../../shared/lib/format'
import { useDebouncedValue } from '../../../shared/lib/use-debounced-value'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { Chip } from '../../../shared/ui/Chip'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Input, Select } from '../../../shared/ui/Field'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { StatCard } from '../../../shared/ui/StatCard'
import { useToast } from '../../../shared/ui/toast'
import {
  useAttendanceOverview,
  useClassSessions,
  useExportAttendance,
} from '../application/attendance.queries'
import { isAttended, type AttendanceOverview } from '../domain/attendance'
import { EditAttendanceDialog, type EditTarget } from './EditAttendanceDialog'
import { StatusChip } from './StatusChip'

/** RF-08: vista general del módulo activo, editable. */
export function AttendanceOverviewPage() {
  return <AttendanceOverviewView />
}

/** Link al detalle del estudiante dentro del módulo activo o de un módulo del historial. */
const studentHref = (studentId: number, moduleId?: number) =>
  moduleId ? `/admin/modulos/${moduleId}/estudiantes/${studentId}` : `/admin/estudiantes/${studentId}`

/**
 * Matriz de asistencias con filtros y exportación. Con `moduleId` muestra un módulo del historial;
 * con `readOnly` no se puede modificar ningún estado.
 */
export function AttendanceOverviewView({ moduleId, readOnly = false }: { moduleId?: number; readOnly?: boolean }) {
  const [sessionId, setSessionId] = useState<number | undefined>()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [editing, setEditing] = useState<EditTarget | null>(null)

  const sessions = useClassSessions(moduleId)
  const overview = useAttendanceOverview({ moduleId, sessionId, search: debouncedSearch || undefined })
  const exporter = useExportAttendance(moduleId)
  const onEdit = readOnly ? undefined : setEditing
  const toast = useToast()

  const onExport = () =>
    exporter.mutate(undefined, {
      onSuccess: (fileName) => toast.success(`Se descargó ${fileName}`),
      onError: (err) => toast.error(getErrorMessage(err)),
    })

  if (overview.isLoading) return <PageLoader />
  if (overview.error || !overview.data) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="No hay asistencias para mostrar"
          description={getErrorMessage(overview.error)}
          action={
            moduleId ? undefined : (
              <Link to="/admin/nuevo-modulo">
                <Button>Activar un módulo</Button>
              </Link>
            )
          }
        />
      </Card>
    )
  }

  const data = overview.data
  const exportButton = (
    <Button variant="secondary" icon={<Download className="size-4" />} onClick={onExport} loading={exporter.isPending}>
      Exportar a Excel
    </Button>
  )
  return (
    <>
      {moduleId ? (
        <div className="mb-4 flex justify-end">{exportButton}</div>
      ) : (
        <PageHeader title="Asistencias" description={`Vista general del módulo ${data.module.name}`} actions={exportButton} />
      )}

      <div className={cn('mb-5 grid grid-cols-2 gap-3 [&>*]:min-w-0', data.rules.enabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
        <StatCard
          tone="teal"
          label="Estudiantes"
          value={data.rows.length}
          hint={data.atRiskCount > 0 ? `${data.atRiskCount} en riesgo (< ${data.rules.minAttendancePercentage}%)` : undefined}
          icon={<Users className="size-5" />}
        />
        <StatCard tone="brand" label="Presentes" value={data.totals.presentes} icon={<CheckCircle2 className="size-5" />} />
        {data.rules.enabled && (
          <StatCard tone="warning" label="Atrasos" value={data.totals.atrasos} icon={<AlarmClock className="size-5" />} />
        )}
        <StatCard tone="alert" label="Ausentes" value={data.totals.faltas} icon={<XCircle className="size-5" />} />
        <StatCard
          tone="accent"
          label="Asistencia"
          value={data.totals.percentage === null ? '—' : `${data.totals.percentage}%`}
          icon={<Percent className="size-5" />}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="sm:w-64">
            <label htmlFor="date-filter" className="sr-only">Filtrar por fecha</label>
            <Select
              id="date-filter"
              value={sessionId ?? ''}
              onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Todas las fechas</option>
              {sessions.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatShortDate(s.classDate)}
                  {s.classDate === data.today ? ' (hoy)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label htmlFor="student-filter" className="sr-only">Filtrar por estudiante</label>
            <Input
              id="student-filter"
              placeholder="Buscar estudiante por nombre o registro…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="size-4" />}
            />
          </div>
        </div>

        {data.rows.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="Sin resultados" description="Ningún estudiante coincide con la búsqueda." />
        ) : sessionId ? (
          <DayView data={data} onEdit={onEdit} moduleId={moduleId} />
        ) : (
          <MatrixView data={data} onEdit={onEdit} moduleId={moduleId} />
        )}
      </Card>

      {!readOnly && (
        <>
          <p className="mt-3 text-xs text-muted">
            Haz clic en cualquier estado para modificarlo.{' '}
            {data.rules.enabled
              ? 'Sin marca al cerrar el plazo de atraso, el estudiante figura como Falta.'
              : 'Sin marca al terminar el día, el estudiante figura como Falta.'}
          </p>
          <EditAttendanceDialog target={editing} onClose={() => setEditing(null)} />
        </>
      )}
    </>
  )
}

interface ViewProps {
  data: AttendanceOverview
  onEdit?: (t: EditTarget) => void
  moduleId?: number
}

function MatrixView({ data, onEdit, moduleId }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-muted uppercase">
            <th className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-3">Estudiante</th>
            {data.sessions.map((s) => (
              <th
                key={s.id}
                className={cn(
                  'border-b border-line px-2 py-3 text-center whitespace-nowrap capitalize',
                  s.classDate === data.today && 'bg-brand-soft/60 text-brand-ink',
                )}
              >
                {formatShortDate(s.classDate)}
              </th>
            ))}
            <th className="border-b border-line px-3 py-3 text-center">P</th>
            {data.rules.enabled && <th className="border-b border-line px-3 py-3 text-center">A</th>}
            <th className="border-b border-line px-3 py-3 text-center">F</th>
            <th className="border-b border-line px-3 py-3 text-center">%</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.student.id} className="group">
              <td className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-2.5 group-hover:bg-canvas">
                <Link
                  to={studentHref(row.student.id, moduleId)}
                  className="font-semibold whitespace-nowrap hover:text-brand hover:underline"
                >
                  {row.student.fullName}
                </Link>
                <p className="text-xs text-muted">{row.student.registrationNumber}</p>
              </td>
              {row.records.map((record) => (
                <td
                  key={record.sessionId}
                  className={cn(
                    'border-b border-line px-1 py-2 text-center group-hover:bg-canvas',
                    record.date === data.today && 'bg-brand-soft/30',
                  )}
                >
                  <button
                    type="button"
                    disabled={!onEdit}
                    onClick={() => onEdit?.({ student: row.student, record })}
                    className="rounded-full transition enabled:hover:ring-2 enabled:hover:ring-brand/30"
                    title={`${row.student.fullName} · ${formatLongDate(record.date)}${
                      record.markedAt && isAttended(record.status) ? ` · ${formatTime(record.markedAt)}` : ''
                    }${record.source === 'ADMIN' ? ' · corregido por admin' : ''}`}
                  >
                    <StatusChip status={record.status} compact />
                  </button>
                </td>
              ))}
              <td className="border-b border-line px-3 text-center font-bold text-brand-ink tabular-nums group-hover:bg-canvas">
                {row.summary.presentes}
              </td>
              {data.rules.enabled && (
                <td className="border-b border-line px-3 text-center font-bold text-warning-ink tabular-nums group-hover:bg-canvas">
                  {row.summary.atrasos}
                </td>
              )}
              <td className="border-b border-line px-3 text-center font-bold text-alert-ink tabular-nums group-hover:bg-canvas">
                {row.summary.faltas}
              </td>
              <td
                className={cn(
                  'border-b border-line px-3 text-center tabular-nums group-hover:bg-canvas',
                  row.summary.atRisk ? 'font-bold text-alert-ink' : 'text-muted',
                )}
                title={row.summary.atRisk ? `Por debajo del mínimo (${data.rules.minAttendancePercentage}%)` : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {row.summary.atRisk && <TriangleAlert className="size-3.5" />}
                  {row.summary.percentage === null ? '—' : `${row.summary.percentage}%`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-xs font-semibold">
          <tr>
            <td className="sticky left-0 bg-surface px-4 py-2 text-brand-ink">Presentes</td>
            {data.sessionTotals.map((t) => (
              <td key={t.sessionId} className="px-2 py-2 text-center text-brand-ink tabular-nums">{t.presentes}</td>
            ))}
            <td colSpan={data.rules.enabled ? 4 : 3} />
          </tr>
          {data.rules.enabled && (
            <tr>
              <td className="sticky left-0 bg-surface px-4 py-2 text-warning-ink">Atrasos</td>
              {data.sessionTotals.map((t) => (
                <td key={t.sessionId} className="px-2 py-2 text-center text-warning-ink tabular-nums">{t.atrasos}</td>
              ))}
              <td colSpan={4} />
            </tr>
          )}
          <tr>
            <td className="sticky left-0 bg-surface px-4 py-2 text-alert-ink">Ausentes</td>
            {data.sessionTotals.map((t) => (
              <td key={t.sessionId} className="px-2 py-2 text-center text-alert-ink tabular-nums">{t.faltas}</td>
            ))}
            <td colSpan={data.rules.enabled ? 4 : 3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function DayView({ data, onEdit, moduleId }: ViewProps) {
  const session = data.sessions[0]
  const totals = data.sessionTotals[0]
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <p className="mr-2 font-bold">{formatLongDate(session.classDate)}</p>
        <Chip tone="brand">{plural(totals.presentes, 'presente')}</Chip>
        {totals.atrasos > 0 && <Chip tone="warning">{plural(totals.atrasos, 'atraso')}</Chip>}
        <Chip tone="alert">{plural(totals.faltas, 'ausente')}</Chip>
        {totals.pendientes > 0 && <Chip tone="teal">{plural(totals.pendientes, 'pendiente')}</Chip>}
      </div>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-y border-line text-left text-xs font-semibold text-muted uppercase">
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Hora de marca</th>
              {onEdit && <th className="px-4 py-3 text-right">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.rows.map((row) => {
              const record = row.records[0]
              return (
                <tr key={row.student.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-muted tabular-nums">{row.student.registrationNumber}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Link to={studentHref(row.student.id, moduleId)} className="hover:text-brand hover:underline">
                      {row.student.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusChip status={record.status} />
                      {record.source === 'ADMIN' && <Chip tone="accent">Corregido</Chip>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">
                    {isAttended(record.status) && record.markedAt ? formatTime(record.markedAt) : '—'}
                  </td>
                  {onEdit && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Pencil className="size-3.5" />}
                        onClick={() => onEdit({ student: row.student, record })}
                      >
                        Cambiar
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
