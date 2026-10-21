import { ArrowRight, CalendarClock, CalendarRange, Layers, Percent, SquarePlus, UserRound, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatDate, formatDateTime } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useModules } from '../../academic-modules/application/academic-modules.queries'
import type { ModuleListItem } from '../../academic-modules/domain/academic-module'
import { ModuleStatusChip } from './ModuleStatusChip'
import { ScheduledModuleActions } from './ScheduledModuleActions'
import { formatScheduled, relativeFromNow } from './schedule-format'

/** Historial de módulos: el activo, el programado y los finalizados (solo lectura). */
export function ModulesPage() {
  const { data, isLoading, error } = useModules()

  if (isLoading) return <PageLoader />

  const scheduled = data?.find((m) => m.status === 'SCHEDULED')
  const others = data?.filter((m) => m.status !== 'SCHEDULED') ?? []

  return (
    <>
      <PageHeader
        title="Módulos"
        description="El módulo activo, el programado y el historial de los anteriores con todos sus datos."
        actions={
          <Link to="/admin/nuevo-modulo">
            <Button icon={<SquarePlus className="size-4" />}>Nuevo módulo</Button>
          </Link>
        }
      />

      {error ? (
        <Card>
          <EmptyState icon={<Layers className="size-6" />} title="No pudimos cargar los módulos" description={getErrorMessage(error)} />
        </Card>
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={<Layers className="size-6" />}
            title="Todavía no hay módulos"
            description="Cuando actives o programes un módulo aparecerá aquí."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {scheduled && <ScheduledCard module={scheduled} />}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {others.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ScheduledCard({ module }: { module: ModuleListItem }) {
  return (
    <Card className="relative overflow-hidden border-info/30">
      <div aria-hidden className="absolute -top-16 -right-10 size-48 rounded-full bg-info-soft" />
      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-info text-white">
            <CalendarClock className="size-6" />
          </span>
          <div className="min-w-0">
            <ModuleStatusChip status="SCHEDULED" />
            <h2 className="mt-1.5 text-xl font-extrabold">{module.name}</h2>
            <p className="text-sm text-muted">
              Se activará el <strong className="text-ink">{formatScheduled(module.scheduledFor!)}</strong> (
              {relativeFromNow(module.scheduledFor!)}) · {module.studentCount} estudiantes · {module.sessionCount} clases
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScheduledModuleActions module={module} />
          <Link to={`/admin/modulos/${module.id}`}>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="size-4" />}>
              Ver
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

function ModuleCard({ module }: { module: ModuleListItem }) {
  const isActive = module.status === 'ACTIVE'
  const cancelled = module.status === 'CANCELLED'
  return (
    <Link
      to={`/admin/modulos/${module.id}`}
      className={cn(
        'group flex flex-col rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5',
        isActive && 'ring-2 ring-teal/40',
        cancelled && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ModuleStatusChip status={module.status} />
        <ArrowRight className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <h3 className="mt-3 truncate text-lg font-extrabold">{module.name}</h3>
      <p className="text-sm text-muted">
        {module.firstDate && module.lastDate ? `${formatDate(module.firstDate)} – ${formatDate(module.lastDate)}` : 'Sin fechas'}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric icon={<Users className="size-4" />} label="Estudiantes" value={module.studentCount} />
        <Metric icon={<CalendarRange className="size-4" />} label="Clases" value={module.sessionCount} />
        <Metric
          icon={<Percent className="size-4" />}
          label="Asistencia"
          value={module.attendancePercentage === null ? '—' : `${module.attendancePercentage}%`}
        />
      </dl>

      <div className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
        {module.teacherName && (
          <p className="flex items-center gap-1.5">
            <UserRound className="size-3.5" /> {module.teacherName}
          </p>
        )}
        <p>
          {module.activatedAt ? `Activado ${formatDateTime(module.activatedAt)}` : 'Nunca se activó'}
          {module.closedAt && ` · ${cancelled ? 'Cancelado' : 'Cerrado'} ${formatDateTime(module.closedAt)}`}
        </p>
      </div>
    </Link>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-2.5">
      <dd className="flex items-center justify-center gap-1 text-lg font-extrabold tabular-nums">{value}</dd>
      <dt className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted">
        {icon}
        {label}
      </dt>
    </div>
  )
}
