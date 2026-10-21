import { AlarmClock, CalendarDays, CheckCircle2, Percent, TriangleAlert, XCircle } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { StatCard } from '../../../shared/ui/StatCard'
import type { MyAttendance } from '../domain/attendance'

/** Tarjetas de resumen de un estudiante (las ve él y el administrador en el detalle). */
export function AttendanceStats({ data }: { data: MyAttendance }) {
  const { summary, rules } = data
  return (
    <div className={cn('grid grid-cols-2 gap-3 [&>*]:min-w-0', rules.enabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
      <StatCard tone="brand" label="Asistencias" value={summary.presentes} icon={<CheckCircle2 className="size-5" />} />
      {rules.enabled && (
        <StatCard tone="warning" label="Atrasos" value={summary.atrasos} icon={<AlarmClock className="size-5" />} />
      )}
      <StatCard tone="alert" label="Faltas" value={summary.faltas} icon={<XCircle className="size-5" />} />
      <StatCard
        tone="teal"
        label="Clases por venir"
        value={summary.programadas + summary.pendientes}
        icon={<CalendarDays className="size-5" />}
      />
      <StatCard
        tone="accent"
        label="Asistencia"
        value={summary.percentage === null ? '—' : `${summary.percentage}%`}
        hint={`${summary.points} / ${summary.maxPoints} puntos`}
        icon={<Percent className="size-5" />}
      />
    </div>
  )
}

/** Aviso cuando el porcentaje queda por debajo del mínimo del módulo. */
export function RiskBanner({ data, audience }: { data: MyAttendance; audience: 'student' | 'admin' }) {
  if (!data.summary.atRisk) return null
  const { percentage } = data.summary
  const min = data.rules.minAttendancePercentage
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-alert/30 bg-alert-soft px-5 py-4 text-alert-ink">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">{audience === 'student' ? 'Tu asistencia está en riesgo' : 'Estudiante en riesgo'}</p>
        <p className="text-sm">
          {audience === 'student' ? 'Tienes' : 'Tiene'} {percentage}% de asistencia y el mínimo del módulo es {min}%.
          {audience === 'student' && ' Asiste a las próximas clases para recuperarte.'}
        </p>
      </div>
    </div>
  )
}
