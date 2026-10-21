import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Flag,
  HeartHandshake,
  Mail,
  Phone,
  Play,
  Send,
  Share2,
} from 'lucide-react'
import { useState, type ReactNode, type RefObject } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { useToast } from '../../../shared/ui/toast'
import { teacherDisplayName, type TeacherProfile } from '../../profile/domain/profile'
import { Avatar } from '../../profile/presentation/Avatar'
import type { CalendarImageSource } from '../application/use-calendar-image'
import {
  monthsBetween,
  scheduleOf,
  todayIso,
  WEEKDAYS_SHORT,
  type CalendarSession,
} from '../domain/calendar'
import { ShareCalendarDialog } from './ShareCalendarDialog'

/** Botón "Compartir" (abre las opciones) y descarga directa de la imagen. */
export function CalendarShareActions({ source, text }: { source: CalendarImageSource; text: string }) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const toast = useToast()

  const download = async () => {
    setDownloading(true)
    try {
      const image = await source.render()
      const link = document.createElement('a')
      link.href = image.url
      link.download = image.file.name
      link.click()
      setTimeout(() => URL.revokeObjectURL(image.url), 1000)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Button icon={<Share2 className="size-4" />} onClick={() => setOpen(true)}>
        Compartir
      </Button>
      <Button variant="secondary" icon={<Download className="size-4" />} onClick={download} loading={downloading}>
        Descargar imagen
      </Button>
      <ShareCalendarDialog open={open} onClose={() => setOpen(false)} source={source} text={text} />
    </>
  )
}

/** Meses visibles a la vez; con más, se navega con las flechas. */
const VISIBLE_MONTHS = 4

/**
 * Tarjeta del calendario de clases del módulo: encabezado con el docente, meses con los días de clase
 * y panel con inicio, fin, horario, leyenda y contacto. La usan el administrador y el estudiante, y es
 * exactamente lo que se exporta como imagen al compartir.
 */
export function ModuleCalendarCard({
  moduleName,
  sessions,
  teacher,
  teacherPhotoUrl,
  cardRef,
}: {
  moduleName: string
  /** Ordenadas por fecha; al menos una. */
  sessions: CalendarSession[]
  teacher: TeacherProfile | null
  teacherPhotoUrl: string | null
  cardRef?: RefObject<HTMLDivElement | null>
}) {
  const today = todayIso()
  const byDate = new Map(sessions.map((s) => [s.classDate, s]))
  // Las canceladas se ven en el calendario, pero no cuentan para periodo, horario ni totales.
  const active = sessions.filter((s) => s.status !== 'CANCELLED')
  const counted = active.length ? active : sessions
  const first = counted[0].classDate
  const last = counted[counted.length - 1].classDate
  const schedule = scheduleOf(counted)
  const done = active.filter((s) => s.classDate < today).length
  const hasCancelled = active.length < sessions.length
  const hasMakeup = sessions.some((s) => s.isMakeup)
  const months = monthsBetween(first, last)
  const [offset, setOffset] = useState(0)
  const maxOffset = Math.max(0, months.length - VISIBLE_MONTHS)
  const start = Math.min(offset, maxOffset)
  const visible = months.slice(start, start + VISIBLE_MONTHS)
  const nav = { canPrev: start > 0, canNext: start < maxOffset, prev: () => setOffset(start - 1), next: () => setOffset(start + 1) }

  return (
    <div ref={cardRef} className="space-y-4 rounded-3xl bg-canvas p-3 sm:p-4 print:bg-white">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-brand via-[#5b4ff0] to-deco-violet px-5 py-5 text-white shadow-lg shadow-brand/20 sm:px-7 print:bg-brand">
        <div aria-hidden className="absolute -top-24 right-1/4 size-64 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -right-10 -bottom-24 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 sm:size-16">
              <CalendarDays className="size-7 sm:size-8" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.25em] text-white/75 uppercase sm:text-xs">
                Calendario de clases del módulo
              </p>
              <h2 className="mt-1 truncate text-2xl font-extrabold tracking-tight sm:text-4xl">{moduleName}</h2>
            </div>
          </div>
          {teacher && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 pr-6 ring-1 ring-white/25 backdrop-blur">
              <span className="relative shrink-0">
                <Avatar name={teacher.fullName} photoUrl={teacherPhotoUrl} className="size-14 text-lg ring-2 ring-white/50" />
                <span className="absolute right-0 bottom-0 size-3.5 rounded-full bg-deco-teal ring-2 ring-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-widest text-white/70 uppercase">Docente</p>
                <p className="truncate text-lg leading-tight font-bold">{teacherDisplayName(teacher)}</p>
                {teacher.specialty && <p className="truncate text-sm text-white/75">{teacher.specialty}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meses + panel lateral */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className={cn('grid content-start gap-4', visible.length > 1 && 'md:grid-cols-2')}>
          {visible.map(({ year, month }) => (
            <MonthCalendar key={`${year}-${month}`} year={year} month={month} byDate={byDate} today={today} nav={nav} />
          ))}
        </div>

        <aside className="space-y-4">
          <Panel icon={<BookOpen className="size-5" />} title="Información del módulo">
            <div className="space-y-4">
              <InfoItem icon={<Play className="size-4" />} tone="bg-teal-soft text-teal" label="Inicio de módulo" value={formatLongDate(first)} />
              <InfoItem icon={<Flag className="size-4" />} tone="bg-alert-soft text-alert" label="Fin de módulo" value={formatLongDate(last)} />
              <InfoItem
                icon={<Clock3 className="size-4" />}
                tone="bg-brand-soft text-brand"
                label="Días y horario de clases"
                value={
                  <span className="block space-y-1.5">
                    {schedule.map((s) => (
                      <span key={s.hours} className="block">
                        <span className="block first-letter:uppercase">{s.days}</span>
                        <span className="block font-normal text-muted tabular-nums">{s.hours}</span>
                      </span>
                    ))}
                  </span>
                }
              />
              <InfoItem
                icon={<CalendarRange className="size-4" />}
                tone="bg-accent-soft text-accent"
                label="Total de clases"
                value={
                  <>
                    {active.length} clases
                    <span className="block font-normal text-muted">
                      {done} realizadas · {active.length - done} por venir
                      {hasCancelled && ` · ${sessions.length - active.length} canceladas`}
                    </span>
                  </>
                }
              />
            </div>
          </Panel>

          <Panel title="Leyenda de días">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-muted sm:grid-cols-3 xl:grid-cols-2">
              <Legend swatch={<span className="size-5 rounded-md bg-teal" />} label="Día de clase" />
              <Legend swatch={<span className="size-5 rounded-md ring-2 ring-brand ring-inset" />} label="Hoy" />
              <Legend swatch={<span className="size-5 rounded-md bg-surface ring-1 ring-line" />} label="Sin clase" />
              <Legend swatch={<span className="mx-1.5 size-2 rounded-full bg-teal-ink" />} label="Clase realizada" />
              <Legend swatch={<span className="mx-1.5 size-2 rounded-full bg-white ring-1 ring-line" />} label="Clase por venir" />
              {hasCancelled && <Legend swatch={<span className="size-5 rounded-md bg-alert-soft ring-1 ring-alert/40" />} label="Cancelada" />}
              {hasMakeup && <Legend swatch={<span className="size-5 rounded-md bg-teal ring-2 ring-info ring-offset-1 ring-offset-surface" />} label="Recuperación" />}
            </div>
          </Panel>

          {teacher && (
            <Panel icon={<HeartHandshake className="size-5" />} title="Contacto del docente">
              <div className="space-y-2.5 text-sm">
                <p className="flex items-center gap-3 break-all text-muted">
                  <Mail className="size-4 shrink-0" /> {teacher.email}
                </p>
                {teacher.phone && (
                  <p className="flex items-center gap-3 text-muted">
                    <Phone className="size-4 shrink-0" /> {teacher.phone}
                  </p>
                )}
                <a
                  href={`mailto:${teacher.email}?subject=${encodeURIComponent(`Consulta sobre ${moduleName}`)}`}
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold text-brand ring-2 ring-brand/60 transition hover:bg-brand-soft"
                >
                  <Send className="size-4" /> Enviar mensaje
                </a>
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}

interface MonthNav {
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
}

function MonthCalendar({
  year,
  month,
  byDate,
  today,
  nav,
}: {
  year: number
  month: number
  byDate: Map<string, CalendarSession>
  today: string
  nav: MonthNav
}) {
  // Semanas completas de lunes a domingo, con los días del mes anterior y siguiente atenuados.
  const firstDay = new Date(Date.UTC(year, month, 1))
  const start = new Date(firstDay)
  start.setUTCDate(1 - ((firstDay.getUTCDay() + 6) % 7))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const weeks = Math.ceil(((firstDay.getUTCDay() + 6) % 7 + daysInMonth) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month }
  })
  const name = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(firstDay)

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line break-inside-avoid">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
        <NavButton label="Mes anterior" disabled={!nav.canPrev} onClick={nav.prev}>
          <ChevronLeft className="size-4" />
        </NavButton>
        <p className="text-lg font-bold first-letter:uppercase">{name}</p>
        <NavButton label="Mes siguiente" disabled={!nav.canNext} onClick={nav.next}>
          <ChevronRight className="size-4" />
        </NavButton>
      </div>
      <div className="grid grid-cols-7 gap-1.5 p-3 text-center text-sm">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="py-1 text-xs font-bold text-brand uppercase">
            {d}
          </span>
        ))}
        {cells.map((cell) => {
          const found = cell.inMonth ? byDate.get(cell.iso) : undefined
          const cancelled = found?.status === 'CANCELLED'
          const session = cancelled ? undefined : found
          const isToday = cell.inMonth && cell.iso === today
          return (
            <span
              key={cell.iso}
              title={
                cancelled
                  ? 'Clase cancelada'
                  : session
                    ? `${session.isMakeup ? 'Clase de recuperación' : 'Clase'} de ${session.startTime} a ${session.endTime}`
                    : undefined
              }
              className={cn(
                'relative grid aspect-square place-items-center rounded-xl font-semibold tabular-nums',
                !cell.inMonth && 'bg-canvas/60 text-muted/50',
                cell.inMonth && !session && !cancelled && 'bg-canvas text-ink/80',
                cancelled && 'bg-alert-soft text-alert-ink line-through ring-1 ring-alert/40',
                session?.isMakeup && 'ring-2 ring-info ring-offset-2 ring-offset-surface',
                session && 'bg-linear-to-b from-teal to-[#0c7d75] text-white shadow-sm shadow-teal/30',
                isToday && (session ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : 'bg-brand-soft text-brand-ink ring-2 ring-brand'),
              )}
            >
              {cell.day}
              {session && (
                <span
                  className={cn(
                    'absolute bottom-1.5 size-1.5 rounded-full',
                    cell.iso < today ? 'bg-teal-ink' : 'bg-white/90',
                  )}
                />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Las flechas no se incluyen en la imagen exportada. */
function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  // El contenedor conserva el espacio en la imagen para que el nombre del mes siga centrado.
  return (
    <span className="size-9 shrink-0">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        data-export-hide=""
        className="grid size-9 place-items-center rounded-xl bg-canvas text-ink ring-1 ring-line transition enabled:hover:bg-brand-soft enabled:hover:text-brand disabled:opacity-40 print:invisible"
      >
        {children}
      </button>
    </span>
  )
}

function Panel({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5 break-inside-avoid">
      <p className="mb-4 flex items-center gap-2.5 font-bold">
        {icon && <span className="text-brand">{icon}</span>}
        {title}
      </p>
      {children}
    </div>
  )
}

function InfoItem({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}>{icon}</span>
      <div className="min-w-0 text-sm">
        <p className="text-muted">{label}</p>
        <div className="font-bold text-ink">{value}</div>
      </div>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      {label}
    </span>
  )
}
