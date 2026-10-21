import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Layers,
  Percent,
  SquarePlus,
  TriangleAlert,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../../../shared/lib/cn'
import { formatDate, formatDateTime, formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { StatCard } from '../../../shared/ui/StatCard'
import { useActiveModule } from '../../academic-modules/application/academic-modules.queries'
import type { ActiveModule } from '../../academic-modules/domain/academic-module'
import { useActivity } from '../../activity/application/activity.queries'
import { useAttendanceOverview } from '../../attendance/application/attendance.queries'
import type { AttendanceOverview } from '../../attendance/domain/attendance'
import { todayIso } from '../../calendar/domain/calendar'
import { ClassCodeCard } from '../../class-sessions/presentation/ClassCodeCard'
import { UsageGuideDialog } from './UsageGuideDialog'

/** Resumen del administrador: compone datos de varias features. */
export function AdminHomePage() {
  const active = useActiveModule()
  const overview = useAttendanceOverview()

  if (active.isLoading) return <PageLoader />
  const module = active.data ?? null
  const data = module ? overview.data : undefined

  return (
    <>
      <PageHeader
        breadcrumb="Inicio"
        title="Resumen"
        description="Aquí puedes ver el estado del módulo y acceder rápidamente a las funciones principales."
        actions={
          <span className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-surface px-4 text-sm font-medium text-ink shadow-sm ring-1 ring-line">
            <CalendarDays className="size-4 text-muted" />
            {formatLongDate(todayIso())}
          </span>
        }
      />

      <div className="space-y-6">
        {module ? <ModuleOverview module={module} data={data} /> : <NoModuleHero />}
        <QuickAccess />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] *:min-w-0">
          <QuickGuide module={module} data={data} />
          <HelpCard />
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── Sin módulo ───────────────────────── */

function NoModuleHero() {
  return (
    <Card className="relative overflow-hidden rounded-3xl px-6 py-12 sm:py-14">
      <CalendarIllustration />
      <ChecklistIllustration />
      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand shadow-sm">
          <Layers className="size-8" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold sm:text-2xl">No hay un módulo activo</h2>
        <p className="mt-2 text-muted">
          Importa la lista de estudiantes y las fechas de clase para empezar a registrar asistencias.
        </p>
        <Link to="/admin/nuevo-modulo" className="mt-6">
          <Button size="lg" icon={<Upload className="size-5" />} className="h-13 shadow-lg shadow-brand/30">
            Activar primer módulo
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function CalendarIllustration() {
  return (
    <div aria-hidden className="absolute top-1/2 left-[6%] hidden -translate-y-1/2 lg:block">
      <div className="w-48 -rotate-12 rounded-3xl bg-surface p-4 shadow-xl ring-1 shadow-brand/10 ring-line/70">
        <div className="mb-3 flex items-center gap-2">
          <span className="size-4 rounded-full bg-line" />
          <span className="h-3 flex-1 rounded-full bg-line" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }, (_, i) => (
            <span key={i} className={cn('aspect-square rounded-md', i === 12 ? 'bg-brand' : 'bg-canvas ring-1 ring-line/60')} />
          ))}
        </div>
      </div>
      <svg className="absolute top-1/2 -right-40 w-40 text-brand/40" viewBox="0 0 160 40" fill="none">
        <path d="M2 30 C 40 0, 70 40, 110 14 S 150 10, 158 30" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
      </svg>
    </div>
  )
}

function ChecklistIllustration() {
  return (
    <div aria-hidden className="absolute top-1/2 right-[6%] hidden -translate-y-1/2 lg:block">
      <svg className="absolute top-6 -left-36 w-36 text-brand/40" viewBox="0 0 140 40" fill="none">
        <path d="M2 34 C 30 4, 60 34, 90 18 S 130 8, 138 20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
      </svg>
      <div className="absolute -top-8 -right-2 flex flex-col gap-1.5 text-brand">
        <span className="h-0.5 w-5 rotate-[-55deg] rounded-full bg-current" />
        <span className="ml-3 h-0.5 w-4 rotate-[-20deg] rounded-full bg-current" />
      </div>
      <div className="w-44 rotate-10 space-y-3 rounded-3xl bg-surface p-4 shadow-xl ring-1 shadow-brand/10 ring-line/70">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand">
              <UserRound className="size-4" />
            </span>
            <span className="flex-1 space-y-1.5">
              <span className="block h-2 rounded-full bg-line" />
              <span className="block h-2 w-2/3 rounded-full bg-canvas" />
            </span>
            <span className="grid size-5 place-items-center rounded-full bg-brand text-white">
              <Check className="size-3" strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Con módulo ───────────────────────── */

function ModuleOverview({ module, data }: { module: ActiveModule; data: AttendanceOverview | undefined }) {
  const activity = useActivity({ page: 1, pageSize: 5 })
  const todayIndex = data?.sessions.findIndex((s) => s.classDate === data.today) ?? -1
  const todaySession = todayIndex >= 0 ? data!.sessions[todayIndex] : null
  const todayTotals = todayIndex >= 0 ? data!.sessionTotals[todayIndex] : null
  const done = data?.sessions.filter((s) => s.classDate < data.today).length ?? 0
  const progress = module.sessionCount ? Math.round((done / module.sessionCount) * 100) : 0
  const marked = todayTotals ? todayTotals.presentes + todayTotals.atrasos : 0

  return (
    <>
      <Card className="relative overflow-hidden rounded-3xl border-0 bg-linear-to-br from-brand via-brand to-[#5b5cf0] text-white">
        <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-deco-violet/70" />
        <div aria-hidden className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-deco-teal/25 blur-2xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">Módulo activo</p>
            <h2 className="mt-2 truncate text-2xl font-extrabold sm:text-3xl">{module.name}</h2>
            <p className="mt-1 text-white/80">
              {module.firstDate && module.lastDate
                ? `Del ${formatDate(module.firstDate)} al ${formatDate(module.lastDate)}`
                : 'Sin fechas'}
              {module.activatedAt && ` · activo desde ${formatDateTime(module.activatedAt)}`}
            </p>
            <div className="mt-5 max-w-md">
              <div className="flex justify-between text-sm text-white/80">
                <span>Avance del módulo</span>
                <span className="font-semibold text-white">
                  {done} de {module.sessionCount} clases
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-deco-teal" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur lg:min-w-64">
            <p className="text-sm font-semibold text-white/75">Clase de hoy</p>
            {todaySession && todayTotals ? (
              <>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">
                  {marked}
                  <span className="text-lg font-semibold text-white/70"> / {todayTotals.total}</span>
                </p>
                <p className="text-sm text-white/80">
                  marcaron · {todaySession.startTime} a {todaySession.endTime}
                </p>
                <Link to="/admin/asistencias" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                  Ver asistencias <ArrowRight className="size-4" />
                </Link>
              </>
            ) : (
              <p className="mt-1 text-lg font-bold">Hoy no hay clase</p>
            )}
          </div>
        </div>
      </Card>

      <ClassCodeCard />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 *:min-w-0">
        <StatCard
          tone="teal"
          label="Estudiantes"
          value={module.studentCount}
          hint={data?.atRiskCount ? `${data.atRiskCount} en riesgo` : undefined}
          icon={<Users className="size-5" />}
        />
        <StatCard tone="brand" label="Fechas de clase" value={module.sessionCount} icon={<CalendarRange className="size-5" />} />
        <StatCard
          tone="accent"
          label="Asistencia global"
          value={data?.totals.percentage == null ? '—' : `${data.totals.percentage}%`}
          icon={<Percent className="size-5" />}
        />
        <StatCard
          tone="alert"
          label="Faltas"
          value={data?.totals.faltas ?? '—'}
          icon={data?.atRiskCount ? <TriangleAlert className="size-5" /> : <CheckCircle2 className="size-5" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Actividad reciente"
          actions={
            <Link to="/admin/actividades" className="text-sm font-semibold text-brand hover:text-brand-ink">
              Ver todo
            </Link>
          }
        />
        {!activity.data?.items.length ? (
          <p className="p-5 text-sm text-muted">Sin actividad todavía.</p>
        ) : (
          <ul className="divide-y divide-line">
            {activity.data.items.map((log) => (
              <li key={log.id} className="flex gap-3 px-5 py-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <History className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{log.description}</p>
                  <p className="text-xs text-muted">{formatDateTime(log.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

/* ───────────────────────── Accesos rápidos ───────────────────────── */

const SHORTCUTS: { to: string; title: string; text: string; icon: LucideIcon; tone: string }[] = [
  { to: '/admin/estudiantes', title: 'Estudiantes', text: 'Gestiona la lista de estudiantes.', icon: Users, tone: 'bg-brand-soft text-brand' },
  {
    to: '/admin/asistencias',
    title: 'Asistencias',
    text: 'Registra y consulta asistencias.',
    icon: ClipboardList,
    tone: 'bg-teal-soft text-teal',
  },
  { to: '/admin/actividades', title: 'Actividades', text: 'Revisa el historial de acciones.', icon: BarChart3, tone: 'bg-warning-soft text-warning' },
  {
    to: '/admin/nuevo-modulo',
    title: 'Nuevo módulo',
    text: 'Crea un nuevo módulo de clases.',
    icon: SquarePlus,
    tone: 'bg-violet-soft text-violet-ink',
  },
]

function QuickAccess() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {SHORTCUTS.map(({ to, title, text, icon: Icon, tone }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5"
        >
          <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', tone)}>
            <Icon className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{title}</span>
            <span className="block text-sm text-muted">{text}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      ))}
    </div>
  )
}

/* ───────────────────────── Guía y ayuda ───────────────────────── */

function QuickGuide({ module, data }: { module: ActiveModule | null; data: AttendanceOverview | undefined }) {
  const marked = data ? data.totals.presentes + data.totals.atrasos > 0 : false
  const steps = [
    { title: 'Crear módulo', text: 'Configura el periodo de clases', done: module !== null, to: '/admin/nuevo-modulo' },
    {
      title: 'Importar estudiantes',
      text: 'Carga la lista desde un archivo',
      done: (module?.studentCount ?? 0) > 0,
      to: '/admin/nuevo-modulo',
    },
    { title: 'Registrar asistencias', text: 'Marca las asistencias diariamente', done: marked, to: '/admin/asistencias' },
    { title: 'Consultar reportes', text: 'Revisa el historial y estadísticas', done: false, to: '/admin/actividades' },
  ]
  const current = steps.findIndex((s) => !s.done)

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Guía rápida</h2>
      <p className="text-sm text-muted">Sigue estos pasos para comenzar.</p>
      <ol className="mt-6 grid gap-5 md:grid-cols-4 md:gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 md:block">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-10 -bottom-5 left-4 w-0.5 md:top-4 md:right-0 md:bottom-auto md:left-12 md:h-0.5 md:w-auto',
                  step.done ? 'bg-brand' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                step.done
                  ? 'bg-brand text-white'
                  : index === current
                    ? 'bg-surface text-brand ring-2 ring-brand'
                    : 'bg-surface text-muted ring-1 ring-line',
              )}
            >
              {step.done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
            </span>
            <Link to={step.to} className="group block md:mt-4 md:pr-3">
              <span className="block font-semibold group-hover:text-brand">{step.title}</span>
              <span className="block text-sm text-muted">{step.text}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function HelpCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex flex-col p-6">
      <h2 className="text-lg font-bold">¿Necesitas ayuda?</h2>
      <p className="mt-1 text-sm text-muted">Consulta la guía de uso con los pasos y formatos de cada función del sistema.</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-auto flex items-center gap-3 rounded-2xl bg-brand-soft/70 px-4 py-3.5 font-semibold text-brand-ink transition hover:bg-brand-soft max-lg:mt-5"
      >
        <BookOpenText className="size-5" />
        Ver guía de uso
        <ArrowRight className="ml-auto size-5" />
      </button>
      <UsageGuideDialog open={open} onClose={() => setOpen(false)} />
    </Card>
  )
}
