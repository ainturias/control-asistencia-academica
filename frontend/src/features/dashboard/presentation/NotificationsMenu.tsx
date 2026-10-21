import { AlarmClock, CalendarClock, CalendarPlus, FileClock, Layers, TriangleAlert, UserX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../../shared/lib/cn'
import { useActiveModule, useModules } from '../../academic-modules/application/academic-modules.queries'
import { formatScheduled, relativeFromNow } from '../../module-history/presentation/schedule-format'
import { useJustifications } from '../../justifications/application/justifications.queries'
import { useAttendanceOverview } from '../../attendance/application/attendance.queries'
import { NotificationBell } from '../../notifications/presentation/NotificationBell'

interface Notice {
  key: string
  icon: ReactNode
  tone: string
  title: string
  detail: string
  to: string
  important: boolean
}

/** Avisos calculados del estado actual del módulo; se refrescan cada 30 s. */
function useNotifications() {
  const module = useActiveModule()
  const hasModule = !!module.data
  const overview = useAttendanceOverview({}, { refetchInterval: 30_000, enabled: hasModule })
  const scheduled = useModules().data?.find((m) => m.status === 'SCHEDULED')
  const pendingJustifications = useJustifications({ status: 'PENDING' }, hasModule).data?.pending ?? 0

  const notices: Notice[] = []
  if (!module.isLoading && !hasModule) {
    notices.push({
      key: 'no-module',
      icon: <Layers className="size-4" />,
      tone: 'bg-brand-soft text-brand-ink',
      title: 'No hay un módulo activo',
      detail: 'Importa estudiantes y fechas para empezar.',
      to: '/admin/nuevo-modulo',
      important: true,
    })
  }

  if (pendingJustifications > 0) {
    notices.push({
      key: 'justifications',
      icon: <FileClock className="size-4" />,
      tone: 'bg-info-soft text-info-ink',
      title: `${pendingJustifications} ${pendingJustifications === 1 ? 'justificación por revisar' : 'justificaciones por revisar'}`,
      detail: 'Estudiantes que enviaron pruebas de una falta o un atraso.',
      to: '/admin/justificaciones',
      important: true,
    })
  }

  if (scheduled?.scheduledFor) {
    notices.push({
      key: 'scheduled',
      icon: <CalendarPlus className="size-4" />,
      tone: 'bg-info-soft text-info-ink',
      title: `"${scheduled.name}" se activará ${relativeFromNow(scheduled.scheduledFor)}`,
      detail: formatScheduled(scheduled.scheduledFor),
      to: `/admin/modulos/${scheduled.id}`,
      important: false,
    })
  }

  const data = hasModule ? overview.data : undefined
  if (data) {
    const todayIndex = data.sessions.findIndex((s) => s.classDate === data.today)
    if (todayIndex >= 0) {
      const session = data.sessions[todayIndex]
      const totals = data.sessionTotals[todayIndex]
      notices.push({
        key: 'today',
        icon: <CalendarClock className="size-4" />,
        tone: 'bg-teal-soft text-teal-ink',
        title: `Hoy hay clase de ${session.startTime} a ${session.endTime}`,
        detail: `${totals.presentes + totals.atrasos} de ${totals.total} estudiantes marcaron asistencia.`,
        to: '/admin/asistencias',
        important: false,
      })
      // Solo hay faltas de hoy cuando se cerró el plazo para marcar.
      if (totals.faltas > 0) {
        notices.push({
          key: 'absent-today',
          icon: <UserX className="size-4" />,
          tone: 'bg-alert-soft text-alert-ink',
          title: `${totals.faltas} ${totals.faltas === 1 ? 'estudiante faltó' : 'estudiantes faltaron'} hoy`,
          detail: 'Se cerró el registro de la clase sin su marca.',
          to: '/admin/asistencias',
          important: true,
        })
      }
    }
    if (data.atRiskCount > 0) {
      notices.push({
        key: 'risk',
        icon: <TriangleAlert className="size-4" />,
        tone: 'bg-alert-soft text-alert-ink',
        title: `${data.atRiskCount} ${data.atRiskCount === 1 ? 'estudiante en riesgo' : 'estudiantes en riesgo'}`,
        detail: `Por debajo del ${data.rules.minAttendancePercentage}% de asistencia.`,
        to: '/admin/asistencias',
        important: true,
      })
    }
    if (!data.rules.enabled) {
      notices.push({
        key: 'rules',
        icon: <AlarmClock className="size-4" />,
        tone: 'bg-warning-soft text-warning-ink',
        title: 'Puntualidad desactivada',
        detail: 'Los estudiantes pueden marcar todo el día de clase.',
        to: '/admin/calendario',
        important: false,
      })
    }
  }

  return { notices, hasModule }
}

/** Campana del admin: avisos del momento (clase de hoy, riesgo…) y las notificaciones guardadas del módulo. */
export function NotificationsMenu() {
  const { notices, hasModule } = useNotifications()
  return (
    <NotificationBell
      enabled={hasModule}
      hasImportantNotice={notices.some((n) => n.important)}
      notices={
        notices.length > 0 ? (
          <ul className="divide-y divide-line">
            {notices.map((notice) => (
              <li key={notice.key}>
                <Link to={notice.to} className="flex gap-3 px-4 py-3 hover:bg-canvas">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', notice.tone)}>{notice.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{notice.title}</span>
                    <span className="block text-xs text-muted">{notice.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  )
}
