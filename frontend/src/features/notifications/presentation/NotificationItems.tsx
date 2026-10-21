import {
  CalendarPlus,
  CalendarSync,
  CircleCheck,
  Clock,
  FileCheck2,
  FileClock,
  FileX2,
  KeyRound,
  Layers,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../../shared/lib/cn'
import { formatDateTime } from '../../../shared/lib/format'
import type { AppNotification, NotificationType } from '../domain/notification'

const META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  SESSION_CANCELLED: { icon: XCircle, tone: 'bg-alert-soft text-alert-ink' },
  SESSION_RESTORED: { icon: RotateCcw, tone: 'bg-teal-soft text-teal-ink' },
  SESSION_RESCHEDULED: { icon: CalendarSync, tone: 'bg-warning-soft text-warning-ink' },
  SESSION_ADDED: { icon: CalendarPlus, tone: 'bg-info-soft text-info-ink' },
  CLASS_CODE_ENABLED: { icon: KeyRound, tone: 'bg-brand-soft text-brand-ink' },
  CLASS_HOURS_ONLY_ENABLED: { icon: Clock, tone: 'bg-warning-soft text-warning-ink' },
  CLASS_CODE_PUBLISHED: { icon: KeyRound, tone: 'bg-brand-soft text-brand-ink' },
  JUSTIFICATION_APPROVED: { icon: FileCheck2, tone: 'bg-teal-soft text-teal-ink' },
  JUSTIFICATION_REJECTED: { icon: FileX2, tone: 'bg-alert-soft text-alert-ink' },
  ATTENDANCE_MARKED: { icon: CircleCheck, tone: 'bg-brand-soft text-brand-ink' },
  JUSTIFICATION_SUBMITTED: { icon: FileClock, tone: 'bg-info-soft text-info-ink' },
  MODULE_ACTIVATED: { icon: Layers, tone: 'bg-teal-soft text-teal-ink' },
}

/** Lista de notificaciones guardadas; las nuevas desde la última visita llevan un punto. */
export function NotificationItems({
  items,
  newerThan,
  onNavigate,
  empty = 'No hay notificaciones en este módulo.',
}: {
  items: AppNotification[]
  /** Fecha de la última visita: lo posterior se marca como nuevo. */
  newerThan: string | null
  onNavigate: () => void
  empty?: string
}) {
  if (items.length === 0) return <p className="px-4 py-6 text-center text-sm text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const meta = META[item.type] ?? META.MODULE_ACTIVATED
        const Icon = meta.icon
        const isNew = !newerThan || item.createdAt > newerThan
        const content = (
          <>
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', meta.tone)}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-1.5 text-sm font-semibold">
                <span>{item.title}</span>
                {isNew && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-alert" title="Nueva" />}
              </span>
              {item.body && <span className="mt-0.5 block text-xs text-muted">{item.body}</span>}
              <span className="mt-1 block text-[11px] text-muted">{formatDateTime(item.createdAt)}</span>
            </span>
          </>
        )
        return (
          <li key={item.id}>
            {item.link ? (
              <Link to={item.link} onClick={onNavigate} className={cn('flex gap-3 px-4 py-3 hover:bg-canvas', isNew && 'bg-brand-soft/30')}>
                {content}
              </Link>
            ) : (
              <div className={cn('flex gap-3 px-4 py-3', isNew && 'bg-brand-soft/30')}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
