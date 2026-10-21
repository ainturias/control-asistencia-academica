import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  History,
  Info,
  LayoutDashboard,
  Layers,
  Percent,
  TriangleAlert,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatDate, formatDateTime } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageLoader } from '../../../shared/ui/Spinner'
import { StatCard } from '../../../shared/ui/StatCard'
import { useModule } from '../../academic-modules/application/academic-modules.queries'
import type { ActiveModule } from '../../academic-modules/domain/academic-module'
import { ActivityView } from '../../activity/presentation/ActivityPage'
import { useAttendanceOverview, useClassSessions } from '../../attendance/application/attendance.queries'
import { AttendanceOverviewView } from '../../attendance/presentation/AttendanceOverviewPage'
import { ReadOnlyBanner } from '../../attendance/presentation/ReadOnlyBanner'
import { calendarFileName, useCalendarImage } from '../../calendar/application/use-calendar-image'
import { calendarSummaryText } from '../../calendar/domain/calendar'
import { CalendarShareActions, ModuleCalendarCard } from '../../calendar/presentation/ModuleCalendarCard'
import { useTeacher, useTeacherPhotoUrl } from '../../profile/application/profile.queries'
import { teacherDisplayName } from '../../profile/domain/profile'
import { SessionChangesHistory } from '../../class-sessions/presentation/SessionChangesHistory'
import { StudentsView } from '../../students/presentation/StudentsPage'
import { ModuleStatusChip } from './ModuleStatusChip'
import { ScheduledModuleActions } from './ScheduledModuleActions'
import { formatScheduled, relativeFromNow } from './schedule-format'

const TABS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { value: 'asistencias', label: 'Asistencias', icon: ClipboardList },
  { value: 'estudiantes', label: 'Estudiantes', icon: Users },
  { value: 'calendario', label: 'Calendario', icon: CalendarDays },
  { value: 'actividades', label: 'Actividades', icon: History },
]

/** Detalle completo de cualquier módulo. Solo el activo se puede editar (desde sus páginas habituales). */
export function ModuleDetailPage() {
  const moduleId = Number(useParams().moduleId)
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab')! : 'resumen'
  const { data: module, isLoading, error } = useModule(moduleId)

  if (isLoading) return <PageLoader />
  if (error || !module) {
    return (
      <Card>
        <EmptyState
          icon={<Layers className="size-6" />}
          title="No encontramos el módulo"
          description={getErrorMessage(error)}
          action={
            <Link to="/admin/modulos">
              <Button variant="secondary">Volver a módulos</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const readOnly = module.status !== 'ACTIVE'

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/modulos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Módulos
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <ModuleStatusChip status={module.status} />
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{module.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {module.firstDate && module.lastDate
                ? `Clases del ${formatDate(module.firstDate)} al ${formatDate(module.lastDate)}`
                : 'Sin fechas de clase'}
              {module.activatedAt && ` · activado ${formatDateTime(module.activatedAt)}`}
              {module.closedAt && ` · ${module.status === 'CANCELLED' ? 'cancelado' : 'cerrado'} ${formatDateTime(module.closedAt)}`}
            </p>
          </div>
          {module.status === 'SCHEDULED' && <ScheduledModuleActions module={module} />}
        </div>
      </div>

      <StatusBanner module={module} />

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1.5 shadow-sm ring-1 ring-line">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setParams(value === 'resumen' ? {} : { tab: value }, { replace: true })}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              tab === value ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-canvas hover:text-ink',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <SummaryTab module={module} />}
      {tab === 'asistencias' && <AttendanceOverviewView moduleId={module.id} readOnly={readOnly} />}
      {tab === 'estudiantes' && <StudentsView moduleId={module.id} />}
      {tab === 'calendario' && <CalendarTab module={module} />}
      {tab === 'actividades' && <ActivityView moduleId={module.id} />}
    </div>
  )
}

function StatusBanner({ module }: { module: ActiveModule }) {
  if (module.status === 'CLOSED' || module.status === 'CANCELLED') return <ReadOnlyBanner moduleName={module.name} />
  if (module.status === 'SCHEDULED') {
    return (
      <Banner tone="bg-info-soft text-info-ink" icon={<AlarmClock className="size-4" />}>
        Se activará automáticamente el <strong>{formatScheduled(module.scheduledFor!)}</strong> (
        {relativeFromNow(module.scheduledFor!)}). Hasta entonces sus estudiantes no pueden ingresar.
      </Banner>
    )
  }
  return (
    <Banner tone="bg-teal-soft text-teal-ink" icon={<Info className="size-4" />}>
      Este es el <strong>módulo activo</strong>. Para modificar asistencias usa{' '}
      <Link to="/admin/asistencias" className="font-bold underline">
        Asistencias
      </Link>
      .
    </Banner>
  )
}

function Banner({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl px-5 py-4 text-sm', tone)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  )
}

function SummaryTab({ module }: { module: ActiveModule }) {
  const overview = useAttendanceOverview({ moduleId: module.id })
  const data = overview.data
  const { rules } = module

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 *:min-w-0">
        <StatCard
          tone="teal"
          label="Estudiantes"
          value={module.studentCount}
          hint={data?.atRiskCount ? `${data.atRiskCount} en riesgo` : undefined}
          icon={<Users className="size-5" />}
        />
        <StatCard tone="brand" label="Clases" value={module.sessionCount} icon={<CalendarRange className="size-5" />} />
        <StatCard
          tone="accent"
          label="Asistencia global"
          value={data?.totals.percentage == null ? '—' : `${data.totals.percentage}%`}
          icon={<Percent className="size-5" />}
        />
        <StatCard tone="alert" label="Faltas" value={data?.totals.faltas ?? '—'} icon={<XCircle className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 *:min-w-0">
        <Card>
          <CardHeader title="Totales de asistencia" />
          <dl className="grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-3">
            <Total label="Presentes" value={data?.totals.presentes} tone="text-brand-ink" icon={<CheckCircle2 className="size-4" />} />
            <Total label="Atrasos" value={data?.totals.atrasos} tone="text-warning-ink" icon={<AlarmClock className="size-4" />} />
            <Total label="Faltas" value={data?.totals.faltas} tone="text-alert-ink" icon={<XCircle className="size-4" />} />
            <Total label="Justificadas" value={data?.totals.justificados} tone="text-info-ink" icon={<Info className="size-4" />} />
            <Total
              label="En riesgo"
              value={data?.atRiskCount}
              tone="text-alert-ink"
              icon={<TriangleAlert className="size-4" />}
            />
            <Total
              label="Puntos"
              value={data ? `${data.totals.points} / ${data.totals.maxPoints}` : undefined}
              tone="text-ink"
              icon={<Percent className="size-4" />}
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Reglas que tuvo el módulo" />
          <ul className="space-y-2 p-5 text-sm">
            <li>
              <strong>Puntualidad:</strong>{' '}
              {rules.enabled
                ? `activada — abre ${rules.openBeforeMinutes} min antes, tolerancia ${rules.toleranceMinutes} min, atraso hasta ${rules.lateLimitMinutes} min`
                : 'desactivada (se marcaba todo el día de clase)'}
            </li>
            <li>
              <strong>Puntos:</strong> Presente {rules.presentPoints} · Atraso {rules.latePoints} · Falta 0
            </li>
            <li>
              <strong>Asistencia mínima:</strong> {rules.minAttendancePercentage}%
            </li>
            <li>
              <strong>Justificaciones de estudiantes:</strong>{' '}
              {rules.justificationDays > 0 ? `hasta ${rules.justificationDays} días después de la clase` : 'desactivadas'}
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Total({ label, value, tone, icon }: { label: string; value: ReactNode; tone: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon}
        {label}
      </dt>
      <dd className={cn('mt-1 text-xl font-extrabold tabular-nums', tone)}>{value ?? '—'}</dd>
    </div>
  )
}

function CalendarTab({ module }: { module: ActiveModule }) {
  const sessions = useClassSessions(module.id)
  const teacher = useTeacher(module.id)
  const photoUrl = useTeacherPhotoUrl(module.id)
  const image = useCalendarImage(calendarFileName(module.name))

  if (sessions.isLoading) return <PageLoader />
  if (!sessions.data?.length) {
    return (
      <Card>
        <EmptyState icon={<CalendarDays className="size-6" />} title="El módulo no tiene fechas de clase" />
      </Card>
    )
  }
  const teacherData = teacher.data ?? null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <CalendarShareActions
          source={image}
          text={calendarSummaryText({
            moduleName: module.name,
            sessions: sessions.data,
            teacherName: teacherData ? teacherDisplayName(teacherData) : null,
          })}
        />
      </div>
      <ModuleCalendarCard
        moduleName={module.name}
        sessions={sessions.data}
        teacher={teacherData}
        teacherPhotoUrl={photoUrl}
        cardRef={image.ref}
      />
      <SessionChangesHistory moduleId={module.id} moduleName={module.name} />
    </div>
  )
}
