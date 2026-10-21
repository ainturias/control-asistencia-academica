import { BarChart3, CalendarCheck2, FileClock, Percent, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { formatShortDate } from '../../../shared/lib/format'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Select } from '../../../shared/ui/Field'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { StatCard } from '../../../shared/ui/StatCard'
import { useModules } from '../../academic-modules/application/academic-modules.queries'
import { MODULE_STATUS_LABELS } from '../../academic-modules/domain/academic-module'
import { useAttendanceOverview } from '../../attendance/application/attendance.queries'
import { useJustifications } from '../../justifications/application/justifications.queries'
import { Legend, PercentBars, PercentLineChart, StackedColumns, type Series } from './charts'

/** Orden fijo de los estados (validado para daltonismo): Presente, Atraso, Justificado, Falta. */
const STATUS_SERIES: Series[] = [
  { key: 'presentes', label: 'Presente', color: 'var(--color-chart-present)' },
  { key: 'atrasos', label: 'Atraso', color: 'var(--color-chart-late)' },
  { key: 'justificados', label: 'Justificado', color: 'var(--color-chart-excused)' },
  { key: 'faltas', label: 'Falta', color: 'var(--color-chart-absent)' },
]

/** Reportes del módulo activo (o de uno del historial) con gráficos y comparación entre módulos. */
export function ReportsPage() {
  const modules = useModules()
  const [moduleId, setModuleId] = useState<number | undefined>()
  const overview = useAttendanceOverview({ moduleId })
  const pendingJustifications = useJustifications({ status: 'PENDING', moduleId }).data?.pending

  const data = overview.data
  const selectable = (modules.data ?? []).filter((m) => m.status === 'ACTIVE' || m.status === 'CLOSED')

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Cómo va la asistencia del módulo: por clase, por estado, por estudiante y frente a módulos anteriores."
        actions={
          selectable.length > 1 && (
            <div className="w-64">
              <label htmlFor="report-module" className="sr-only">
                Módulo
              </label>
              <Select
                id="report-module"
                value={moduleId ?? ''}
                onChange={(e) => setModuleId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Módulo activo</option>
                {selectable
                  .filter((m) => m.status === 'CLOSED')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({MODULE_STATUS_LABELS[m.status].toLowerCase()})
                    </option>
                  ))}
              </Select>
            </div>
          )
        }
      />

      {overview.isLoading ? (
        <PageLoader />
      ) : !data ? (
        <Card>
          <EmptyState icon={<BarChart3 className="size-6" />} title="No hay datos para mostrar" description={getErrorMessage(overview.error)} />
        </Card>
      ) : (
        <ReportBody data={data} pendingJustifications={pendingJustifications} />
      )}

      <ModulesComparison />
    </>
  )
}

function ReportBody({
  data,
  pendingJustifications,
}: {
  data: NonNullable<ReturnType<typeof useAttendanceOverview>['data']>
  pendingJustifications: number | undefined
}) {
  // Solo las clases que ya tienen estados finales (realizadas y no canceladas).
  const held = data.sessions
    .map((session, index) => ({ session, totals: data.sessionTotals[index] }))
    .filter(({ session, totals }) => session.status !== 'CANCELLED' && totals.completed > 0)

  const linePoints = held
    .filter(({ totals }) => totals.percentage !== null)
    .map(({ session, totals }) => ({
      label: formatShortDate(session.classDate),
      value: totals.percentage!,
      detail: `${totals.percentage}% de asistencia · ${totals.presentes + totals.atrasos} de ${totals.presentes + totals.atrasos + totals.faltas} estudiantes`,
    }))

  const columns = held.map(({ session, totals }) => ({
    label: formatShortDate(session.classDate),
    values: { presentes: totals.presentes, atrasos: totals.atrasos, justificados: totals.justificados, faltas: totals.faltas },
  }))

  const ranking = data.rows
    .filter((row) => row.summary.percentage !== null)
    .sort((a, b) => a.summary.percentage! - b.summary.percentage! || a.student.fullName.localeCompare(b.student.fullName))
    .slice(0, 10)
  const scheduled = data.sessions.filter((s) => s.status !== 'CANCELLED').length
  const min = data.rules.minAttendancePercentage

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 *:min-w-0">
        <StatCard
          tone="brand"
          label="Asistencia global"
          value={data.totals.percentage === null ? '—' : `${data.totals.percentage}%`}
          hint={`Mínimo del módulo: ${min}%`}
          icon={<Percent className="size-5" />}
        />
        <StatCard tone="teal" label="Clases realizadas" value={`${held.length} / ${scheduled}`} icon={<CalendarCheck2 className="size-5" />} />
        <StatCard
          tone="alert"
          label="Estudiantes en riesgo"
          value={data.atRiskCount}
          hint={`de ${data.rows.length} estudiantes`}
          icon={<TriangleAlert className="size-5" />}
        />
        <StatCard
          tone="info"
          label="Justificaciones pendientes"
          value={pendingJustifications ?? '—'}
          icon={<FileClock className="size-5" />}
        />
      </div>

      {held.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-6" />}
            title="Todavía no hay clases realizadas"
            description="Los gráficos aparecen cuando termina la primera clase del módulo."
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 *:min-w-0">
          <ChartCard
            title="Asistencia por clase"
            description="Porcentaje de estudiantes que asistieron (presentes y atrasos) en cada clase realizada."
            table={
              <DataTable
                head={['Clase', 'Asistencia']}
                rows={linePoints.map((p) => [p.label, `${p.value}%`])}
              />
            }
          >
            <PercentLineChart points={linePoints} threshold={{ value: min, label: `Mín. ${min}%` }} />
          </ChartCard>

          <ChartCard
            title="Estados por clase"
            description="Cantidad de estudiantes en cada estado, clase por clase."
            legend={<Legend series={STATUS_SERIES} />}
            table={
              <DataTable
                head={['Clase', ...STATUS_SERIES.map((s) => s.label)]}
                rows={columns.map((c) => [c.label, ...STATUS_SERIES.map((s) => String(c.values[s.key as keyof typeof c.values]))])}
              />
            }
          >
            <StackedColumns items={columns} series={STATUS_SERIES} />
          </ChartCard>
        </div>
      )}

      <Card>
        <CardHeader
          title="Estudiantes con menor asistencia"
          description={`Los 10 porcentajes más bajos. La línea marca el mínimo del módulo (${min}%).`}
        />
        <div className="p-5">
          {ranking.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay asistencias evaluadas.</p>
          ) : (
            <PercentBars
              threshold={min}
              items={ranking.map((row) => ({
                key: row.student.id,
                label: row.student.fullName,
                sub: `${row.summary.faltas} faltas · ${row.summary.points}/${row.summary.maxPoints} puntos`,
                value: row.summary.percentage!,
                href: data.module.status === 'ACTIVE'
                  ? `/admin/estudiantes/${row.student.id}`
                  : `/admin/modulos/${data.module.id}/estudiantes/${row.student.id}`,
              }))}
            />
          )}
        </div>
      </Card>
    </div>
  )
}

function ModulesComparison() {
  const modules = useModules()
  const items = (modules.data ?? [])
    .filter((m) => (m.status === 'ACTIVE' || m.status === 'CLOSED') && m.attendancePercentage !== null)
    .map((m) => ({
      key: m.id,
      label: m.name,
      sub: `${MODULE_STATUS_LABELS[m.status]} · ${m.studentCount} estudiantes`,
      value: m.attendancePercentage!,
      href: `/admin/modulos/${m.id}`,
    }))
  if (items.length < 2) return null
  return (
    <Card className="mt-6">
      <CardHeader title="Comparación entre módulos" description="Asistencia global de cada módulo sobre sus clases realizadas." />
      <div className="p-5">
        <PercentBars items={items} />
      </div>
    </Card>
  )
}

function ChartCard({
  title,
  description,
  legend,
  table,
  children,
}: {
  title: string
  description: string
  legend?: ReactNode
  table: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="space-y-3 p-5">
        {legend}
        {children}
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">Ver datos en tabla</summary>
          <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-line">{table}</div>
        </details>
      </div>
    </Card>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-canvas">
        <tr className="text-left text-xs font-semibold text-muted uppercase">
          {head.map((h) => (
            <th key={h} className="px-3 py-2">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-1.5 capitalize tabular-nums">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
