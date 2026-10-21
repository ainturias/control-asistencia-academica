import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Field, Input } from '../../../shared/ui/Field'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import type { ClassSession } from '../../attendance/domain/attendance'
import { todayIso } from '../../calendar/domain/calendar'
import { imagesError } from '../../justifications/domain/justification'
import { ImagePicker } from '../../justifications/presentation/ImagePicker'
import { useSessionActions } from '../application/sessions.queries'
import { MAX_CHANGE_PHOTOS } from '../domain/session-change'

export type SessionDialogMode =
  | { kind: 'cancel'; session: ClassSession }
  | { kind: 'restore'; session: ClassSession }
  | { kind: 'reschedule'; session: ClassSession }
  /** `fromCancelled`: nueva fecha para una clase que se canceló (queda como recuperación). */
  | { kind: 'add'; template: ClassSession | null; fromCancelled?: ClassSession }

const TITLES = {
  cancel: 'Cancelar clase',
  restore: 'Restaurar clase',
  reschedule: 'Reprogramar clase',
  add: 'Agregar clase de recuperación',
}

/** Formulario común de los cambios de clase: fecha y horario (si aplica), motivo y hasta 3 fotos. */
export function SessionChangeDialog({
  mode,
  onClose,
  onDone,
}: {
  mode: SessionDialogMode | null
  onClose: () => void
  /** Se llama después de guardar el cambio (p. ej. para ofrecer reprogramar una clase cancelada). */
  onDone?: (mode: SessionDialogMode) => void
}) {
  const title = mode ? (mode.kind === 'add' && mode.fromCancelled ? 'Reprogramar clase cancelada' : TITLES[mode.kind]) : ''
  return (
    <Modal open={mode !== null} onClose={onClose} title={title} size="lg">
      {mode && <ChangeForm key={JSON.stringify(mode)} mode={mode} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}

function ChangeForm({
  mode,
  onClose,
  onDone,
}: {
  mode: SessionDialogMode
  onClose: () => void
  onDone?: (mode: SessionDialogMode) => void
}) {
  const actions = useSessionActions()
  const toast = useToast()
  const base = mode.kind === 'add' ? mode.template : mode.session
  const needsDate = mode.kind === 'reschedule' || mode.kind === 'add'
  const [date, setDate] = useState(mode.kind === 'reschedule' ? mode.session.classDate : '')
  const [startTime, setStartTime] = useState(base?.startTime ?? '')
  const [endTime, setEndTime] = useState(base?.endTime ?? '')
  const [reason, setReason] = useState(
    mode.kind === 'add' && mode.fromCancelled
      ? `Reprogramación de la clase cancelada del ${formatLongDate(mode.fromCancelled.classDate).toLowerCase()}.`
      : '',
  )
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const pending = Object.values(actions).some((m) => m.isPending)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const problem =
      (needsDate && (!date || !startTime || !endTime) && 'Completa la fecha y el horario') ||
      (needsDate && startTime >= endTime && 'La hora de fin debe ser posterior a la de inicio') ||
      (reason.trim().length < 5 && 'Escribe el motivo (al menos 5 caracteres)') ||
      (files.length > 0 && imagesError(files, 0)) ||
      null
    setError(problem)
    if (problem) return

    const request = { reason, files }
    const data = { date, startTime, endTime }
    const options = {
      onSuccess: () => {
        toast.success(`${TITLES[mode.kind]}: listo. Los estudiantes recibieron la notificación.`)
        onClose()
        onDone?.(mode)
      },
      onError: (err: unknown) => setError(getErrorMessage(err)),
    }
    if (mode.kind === 'cancel') actions.cancel.mutate({ id: mode.session.id, request }, options)
    else if (mode.kind === 'restore') actions.restore.mutate({ id: mode.session.id, request }, options)
    else if (mode.kind === 'reschedule') actions.reschedule.mutate({ id: mode.session.id, data, request }, options)
    else actions.add.mutate({ data, request }, options)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {mode.kind === 'add' && mode.fromCancelled && (
        <div className="rounded-xl bg-canvas p-4 text-sm">
          <p>
            Clase cancelada: <strong>{formatLongDate(mode.fromCancelled.classDate)}</strong> ({mode.fromCancelled.startTime} a{' '}
            {mode.fromCancelled.endTime}).
          </p>
          <p className="text-muted">Elige la nueva fecha: se agregará como clase de recuperación y la original seguirá como cancelada.</p>
        </div>
      )}
      {mode.kind !== 'add' && (
        <div className="rounded-xl bg-canvas p-4">
          <p className="font-bold">{formatLongDate(mode.session.classDate)}</p>
          <p className="text-sm text-muted">
            Clase de {mode.session.startTime} a {mode.session.endTime}
          </p>
        </div>
      )}
      {mode.kind === 'cancel' && (
        <p className="text-sm text-muted">
          La clase no se dictará y <strong className="text-ink">no contará como falta</strong> para nadie. Puedes restaurarla después.
        </p>
      )}

      {needsDate && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={mode.kind === 'reschedule' ? 'Nueva fecha' : 'Fecha'} htmlFor="change-date">
            <Input id="change-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora inicio" htmlFor="change-start">
            <Input id="change-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Hora fin" htmlFor="change-end">
            <Input id="change-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="change-reason" className="text-sm font-semibold">
          Motivo
        </label>
        <textarea
          id="change-reason"
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            mode.kind === 'cancel'
              ? 'Ej.: Feriado nacional por el día de la independencia.'
              : mode.kind === 'add'
                ? 'Ej.: Recuperación de la clase cancelada del 16/10.'
                : 'Ej.: El aula estará ocupada; pasamos la clase al martes.'
          }
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold">
          Fotos <span className="font-normal text-muted">(opcional, por ejemplo el comunicado)</span>
        </p>
        <ImagePicker files={files} onChange={setFiles} max={MAX_CHANGE_PHOTOS} />
      </div>

      {error && <p className="rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">{error}</p>}
      <p className="text-xs text-muted">Los estudiantes verán el cambio, el motivo y las fotos en su panel. Queda en el historial.</p>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Volver
        </Button>
        <Button type="submit" variant={mode.kind === 'cancel' ? 'danger' : 'primary'} loading={pending}>
          {TITLES[mode.kind]}
        </Button>
      </div>
    </form>
  )
}
