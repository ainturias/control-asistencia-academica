import { CalendarPlus, CalendarSync, RotateCcw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { Chip } from '../../../shared/ui/Chip'
import { Modal } from '../../../shared/ui/Modal'
import { useClassSessions } from '../../attendance/application/attendance.queries'
import type { ClassSession } from '../../attendance/domain/attendance'
import { todayIso } from '../../calendar/domain/calendar'
import { SessionChangeDialog, type SessionDialogMode } from './SessionChangeDialog'

/** Lista de clases del módulo activo con acciones para cancelar, restaurar, reprogramar o recuperar. */
export function ManageSessionsCard() {
  const sessions = useClassSessions()
  const [mode, setMode] = useState<SessionDialogMode | null>(null)
  // Después de cancelar se ofrece reprogramar la misma clase.
  const [askReschedule, setAskReschedule] = useState<ClassSession | null>(null)
  const [onlyUpcoming, setOnlyUpcoming] = useState(true)
  const today = todayIso()
  const all = sessions.data ?? []
  const shown = onlyUpcoming ? all.filter((s) => s.classDate >= today) : all
  const last = all[all.length - 1] ?? null

  return (
    <Card>
      <CardHeader
        title="Gestionar clases"
        description="Cancela una clase (feriado, paro…), reprográmala o agrega una de recuperación."
        actions={
          <Button size="sm" icon={<CalendarPlus className="size-4" />} onClick={() => setMode({ kind: 'add', template: last })}>
            Agregar recuperación
          </Button>
        }
      />
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyUpcoming} onChange={(e) => setOnlyUpcoming(e.target.checked)} className="size-4 accent-brand" />
          Solo desde hoy
        </label>
        <span className="text-sm text-muted">{shown.length} clases</span>
      </div>
      <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
        {shown.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No hay clases para mostrar.</li>}
        {shown.map((session) => {
          const cancelled = session.status === 'CANCELLED'
          return (
            <li key={session.id} className={cn('flex flex-wrap items-center gap-3 px-5 py-3', cancelled && 'bg-canvas/60')}>
              <div className="min-w-0 flex-1">
                <p className={cn('font-semibold capitalize', cancelled && 'text-muted line-through')}>
                  {formatShortDate(session.classDate)}
                  {session.classDate === today && <span className="ml-2 text-xs font-bold text-brand uppercase not-italic">Hoy</span>}
                </p>
                <p className="text-sm text-muted tabular-nums">
                  {session.startTime} – {session.endTime}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {cancelled && <Chip tone="alert">Cancelada</Chip>}
                {session.isMakeup && <Chip tone="info">Recuperación</Chip>}
                {cancelled ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<CalendarSync className="size-3.5" />}
                      onClick={() => setMode({ kind: 'add', template: session, fromCancelled: session })}
                    >
                      Reprogramar
                    </Button>
                    <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => setMode({ kind: 'restore', session })}>
                      Restaurar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" icon={<CalendarSync className="size-3.5" />} onClick={() => setMode({ kind: 'reschedule', session })}>
                      Reprogramar
                    </Button>
                    <Button size="sm" variant="ghost" icon={<XCircle className="size-3.5" />} onClick={() => setMode({ kind: 'cancel', session })}>
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <SessionChangeDialog
        mode={mode}
        onClose={() => setMode(null)}
        onDone={(done) => done.kind === 'cancel' && setAskReschedule(done.session)}
      />
      <Modal
        open={askReschedule !== null}
        onClose={() => setAskReschedule(null)}
        title="Clase cancelada"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAskReschedule(null)}>
              No, dejarla cancelada
            </Button>
            <Button
              icon={<CalendarSync className="size-4" />}
              onClick={() => {
                const session = askReschedule!
                setAskReschedule(null)
                setMode({ kind: 'add', template: session, fromCancelled: session })
              }}
            >
              Sí, reprogramar
            </Button>
          </>
        }
      >
        {askReschedule && (
          <p className="text-sm">
            Se canceló la clase del <strong>{formatShortDate(askReschedule.classDate)}</strong> ({askReschedule.startTime} a{' '}
            {askReschedule.endTime}). ¿Deseas reprogramarla a otra fecha? Los estudiantes recibirán una notificación con la nueva
            fecha.
          </p>
        )}
      </Modal>
    </Card>
  )
}
