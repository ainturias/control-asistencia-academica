import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import type { AttendanceRecord } from '../../attendance/domain/attendance'
import { StatusChip } from '../../attendance/presentation/StatusChip'
import { useSubmitJustification } from '../application/justifications.queries'
import { imagesError } from '../domain/justification'
import { ImagePicker } from './ImagePicker'

/** El estudiante justifica una falta o un atraso con un motivo y hasta 4 imágenes de prueba. */
export function JustifyDialog({
  record,
  windowDays,
  onClose,
}: {
  record: AttendanceRecord | null
  windowDays: number
  onClose: () => void
}) {
  return (
    <Modal open={record !== null} onClose={onClose} title="Justificar inasistencia" size="lg">
      {record && <JustifyForm key={record.sessionId} record={record} windowDays={windowDays} onClose={onClose} />}
    </Modal>
  )
}

function JustifyForm({ record, windowDays, onClose }: { record: AttendanceRecord; windowDays: number; onClose: () => void }) {
  const submit = useSubmitJustification()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const send = (event: FormEvent) => {
    event.preventDefault()
    const problem = reason.trim().length < 5 ? 'Explica el motivo (al menos 5 caracteres)' : imagesError(files, 1)
    setError(problem)
    if (problem) return
    submit.mutate(
      { sessionId: record.sessionId, reason, files },
      {
        onSuccess: () => {
          toast.success('Justificación enviada. Tu docente la revisará.')
          onClose()
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    )
  }

  return (
    <form onSubmit={send} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas p-4">
        <div>
          <p className="font-bold">{formatLongDate(record.date)}</p>
          <p className="text-sm text-muted">
            Clase de {record.startTime} a {record.endTime}
          </p>
        </div>
        <StatusChip status={record.status} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="justify-reason" className="text-sm font-semibold">
          ¿Qué pasó?
        </label>
        <textarea
          id="justify-reason"
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej.: Estaba en clase pero se cortó la luz de 19:00 a 21:00 y no pude marcar."
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Pruebas</p>
        <ImagePicker files={files} onChange={setFiles} />
      </div>

      {error && <p className="rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">{error}</p>}
      <p className="text-xs text-muted">
        Tu docente revisará la justificación y decidirá si cambia tu asistencia. Puedes justificar hasta{' '}
        {windowDays} {windowDays === 1 ? 'día' : 'días'} después de la clase.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submit.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={submit.isPending}>
          Enviar justificación
        </Button>
      </div>
    </form>
  )
}
