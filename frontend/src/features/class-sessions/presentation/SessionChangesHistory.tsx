import { CalendarPlus, CalendarSync, History, RotateCcw, XCircle } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { formatDateTime, formatShortDate } from '../../../shared/lib/format'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { useSessionChanges } from '../application/sessions.queries'
import { CHANGE_LABELS, type SessionChangeAction, type SessionSnapshot } from '../domain/session-change'
import { ChangePhotos } from './ChangePhotos'
import { ShareChangeButton } from './ShareChangeButton'

const ICONS: Record<SessionChangeAction, { icon: typeof XCircle; tone: string }> = {
  CANCEL: { icon: XCircle, tone: 'bg-alert-soft text-alert-ink' },
  RESTORE: { icon: RotateCcw, tone: 'bg-teal-soft text-teal-ink' },
  RESCHEDULE: { icon: CalendarSync, tone: 'bg-warning-soft text-warning-ink' },
  ADD: { icon: CalendarPlus, tone: 'bg-info-soft text-info-ink' },
}

const describe = (s: SessionSnapshot) => `${formatShortDate(s.date)} · ${s.startTime}–${s.endTime}`

/** Historial de cambios de clases con motivo y fotos; lo ven el admin y los estudiantes. */
export function SessionChangesHistory({
  moduleId,
  moduleName,
  title = 'Historial de cambios de clases',
  emptyHidden = false,
}: {
  moduleId?: number
  /** Nombre del módulo para la tarjeta que se comparte. */
  moduleName: string
  title?: string
  /** Para el estudiante: no mostrar la tarjeta si no hubo cambios. */
  emptyHidden?: boolean
}) {
  const { data } = useSessionChanges(moduleId)
  if (emptyHidden && !data?.length) return null

  return (
    <Card>
      <CardHeader title={title} description="Clases canceladas, reprogramadas o de recuperación, con su motivo." />
      {!data?.length ? (
        <p className="flex items-center gap-2 p-5 text-sm text-muted">
          <History className="size-4" /> Todavía no hubo cambios en las clases.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {data.map((change) => {
            const meta = ICONS[change.action]
            const Icon = meta.icon
            return (
              <li key={change.id} className="flex gap-4 px-5 py-4">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', meta.tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{CHANGE_LABELS[change.action]}</p>
                    <ShareChangeButton change={change} moduleName={moduleName} />
                  </div>
                  <p className="text-sm text-ink/80 capitalize">
                    {change.previous && change.next
                      ? `${describe(change.previous)}  →  ${describe(change.next)}`
                      : describe((change.previous ?? change.next)!)}
                  </p>
                  <p className="text-sm text-muted">{change.reason}</p>
                  <ChangePhotos change={change} size="sm" />
                  <p className="text-xs text-muted">
                    {change.adminName ?? 'Docente'} · {formatDateTime(change.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
