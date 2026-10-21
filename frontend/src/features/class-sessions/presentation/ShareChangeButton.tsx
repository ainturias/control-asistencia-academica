import { CalendarClock, CalendarPlus, CalendarSync, RotateCcw, Share2, XCircle } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { cn } from '../../../shared/lib/cn'
import { formatDateTime, formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { LoadedPhoto } from '../../../shared/ui/PhotoGallery'
import { calendarFileName, useCalendarImage } from '../../calendar/application/use-calendar-image'
import { CalendarShareActions } from '../../calendar/presentation/ModuleCalendarCard'
import { useChangePhoto } from '../application/sessions.queries'
import { CHANGE_LABELS, type SessionChange, type SessionChangeAction, type SessionSnapshot } from '../domain/session-change'

const THEME: Record<SessionChangeAction, { header: string; icon: typeof XCircle }> = {
  CANCEL: { header: 'from-[#e8590c] to-[#c2410c]', icon: XCircle },
  RESCHEDULE: { header: 'from-[#d97706] to-[#b45309]', icon: CalendarSync },
  ADD: { header: 'from-[#0284c7] to-[#0369a1]', icon: CalendarPlus },
  RESTORE: { header: 'from-[#0f8f86] to-[#0b6e67]', icon: RotateCcw },
}

const when = (s: SessionSnapshot) => `${formatLongDate(s.date)}, de ${s.startTime} a ${s.endTime}`

/** Texto que acompaña a la imagen al compartir (sin emojis). */
function shareText(change: SessionChange, moduleName: string) {
  const lines = [`*${CHANGE_LABELS[change.action]} - ${moduleName}*`]
  if (change.previous && change.next) {
    lines.push(`- Antes: ${when(change.previous)}`, `- Ahora: ${when(change.next)}`)
  } else {
    lines.push(`- Fecha: ${when((change.previous ?? change.next)!)}`)
  }
  lines.push(`- Motivo: ${change.reason}`)
  return lines.join('\n')
}

/** Botón que abre la tarjeta del cambio lista para compartir o descargar como imagen. */
export function ShareChangeButton({ change, moduleName }: { change: SessionChange; moduleName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="secondary" icon={<Share2 className="size-3.5" />} onClick={() => setOpen(true)}>
        Compartir
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Compartir: ${CHANGE_LABELS[change.action].toLowerCase()}`} size="lg">
        {open && <SharePanel change={change} moduleName={moduleName} />}
      </Modal>
    </>
  )
}

function SharePanel({ change, moduleName }: { change: SessionChange; moduleName: string }) {
  const date = (change.next ?? change.previous)!.date
  const image = useCalendarImage(calendarFileName(`${CHANGE_LABELS[change.action]}-${moduleName}-${date}`))
  return (
    <div className="space-y-4">
      <ChangeCard change={change} moduleName={moduleName} cardRef={image.ref} />
      <div className="flex flex-wrap justify-end gap-2">
        <CalendarShareActions source={image} text={shareText(change, moduleName)} />
      </div>
    </div>
  )
}

/** La tarjeta que se exporta como imagen: tipo de cambio, fechas, motivo y fotos. */
function ChangeCard({
  change,
  moduleName,
  cardRef,
}: {
  change: SessionChange
  moduleName: string
  cardRef: RefObject<HTMLDivElement | null>
}) {
  const theme = THEME[change.action]
  const Icon = theme.icon
  return (
    <div ref={cardRef} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
      <div className={cn('bg-linear-to-br px-6 py-5 text-white', theme.header)}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">Aviso del módulo {moduleName}</p>
            <p className="text-2xl font-extrabold">{CHANGE_LABELS[change.action]}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {change.previous && change.next ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Slot label="Antes" value={when(change.previous)} muted />
            <Slot label="Ahora" value={when(change.next)} />
          </div>
        ) : (
          <Slot label={change.action === 'CANCEL' ? 'Clase cancelada' : 'Fecha de la clase'} value={when((change.previous ?? change.next)!)} />
        )}

        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Motivo</p>
          <p className="mt-1 whitespace-pre-line">{change.reason}</p>
        </div>

        {change.files.length > 0 && (
          <div className={cn('grid gap-3', change.files.length === 1 ? 'grid-cols-1' : change.files.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            {change.files.map((file) => (
              <div key={file.id} className="grid h-44 place-items-center overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
                <CardPhoto changeId={change.id} fileId={file.id} />
              </div>
            ))}
          </div>
        )}

        <p className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-muted">
          <CalendarClock className="size-3.5" />
          Publicado por {change.adminName ?? 'el docente'} el {formatDateTime(change.createdAt)} · Sistema de Registro y Control de Asistencia
        </p>
      </div>
    </div>
  )
}

function Slot({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn('rounded-xl p-4 ring-1 ring-line', muted ? 'bg-canvas text-muted' : 'bg-surface')}>
      <p className="text-xs font-bold tracking-wide uppercase">{label}</p>
      <p className={cn('mt-1 text-lg font-bold first-letter:uppercase', muted ? 'line-through' : 'text-ink')}>{value}</p>
    </div>
  )
}

function CardPhoto({ changeId, fileId }: { changeId: number; fileId: number }) {
  return <LoadedPhoto query={useChangePhoto(changeId, fileId)} mode="thumb" alt="Foto del aviso" />
}
