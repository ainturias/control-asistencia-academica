import { Bell } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../../shared/lib/cn'
import { useMarkNotificationsSeen, useNotificationFeed } from '../application/notifications.queries'
import { NotificationItems } from './NotificationItems'

/**
 * Campana de notificaciones guardadas del módulo (admin y estudiante). Al abrirla se marcan como
 * leídas en el servidor; las nuevas siguen resaltadas mientras el panel está abierto.
 * `notices` son avisos calculados en el momento (solo el admin los usa).
 */
export function NotificationBell({
  enabled = true,
  notices,
  hasImportantNotice = false,
  className,
}: {
  enabled?: boolean
  notices?: ReactNode
  hasImportantNotice?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [seenWhenOpened, setSeenWhenOpened] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const feed = useNotificationFeed(enabled)
  const markSeen = useMarkNotificationsSeen()
  const unread = feed.data?.unread ?? 0

  const toggle = () => {
    if (!open) {
      setSeenWhenOpened(feed.data?.lastSeenAt ?? null)
      if (unread > 0) markSeen.mutate()
    }
    setOpen(!open)
  }

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Notificaciones${unread ? ` (${unread} nuevas)` : ''}`}
        className={cn(
          'relative grid size-11 place-items-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-line transition hover:ring-brand/30',
          className,
        )}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-[11px] font-bold text-white ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : (
          notices && (
            <span
              className={cn(
                'absolute top-2 right-2.5 size-2.5 rounded-full ring-2 ring-surface',
                hasImportantNotice ? 'bg-alert' : 'bg-brand',
              )}
            />
          )
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[min(36rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-line">
          <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <p className="font-bold">Notificaciones</p>
            {feed.data && <p className="truncate text-xs text-muted">{feed.data.module.name}</p>}
          </div>
          <div className="overflow-y-auto">
            {notices}
            {notices && (
              <p className="border-y border-line bg-canvas/70 px-4 py-2 text-xs font-bold tracking-wide text-muted uppercase">
                Recientes
              </p>
            )}
            <NotificationItems
              items={feed.data?.items ?? []}
              newerThan={seenWhenOpened}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
