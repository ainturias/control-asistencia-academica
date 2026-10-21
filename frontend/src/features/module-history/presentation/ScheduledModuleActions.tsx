import { CalendarClock, Rocket, XCircle } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { Field, Input } from '../../../shared/ui/Field'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import { useActiveModule, useScheduledModuleActions } from '../../academic-modules/application/academic-modules.queries'
import type { ActiveModule } from '../../academic-modules/domain/academic-module'
import { formatScheduled, toLocalInput } from './schedule-format'

type Dialog = 'reschedule' | 'activate' | 'cancel' | null

/** Cambiar fecha, activar ya o cancelar el módulo programado. */
export function ScheduledModuleActions({ module }: { module: ActiveModule }) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [when, setWhen] = useState(() => toLocalInput(new Date(module.scheduledFor ?? Date.now())))
  const active = useActiveModule()
  const { reschedule, activateNow, cancel } = useScheduledModuleActions()
  const toast = useToast()
  const close = () => setDialog(null)
  const onError = (err: unknown) => toast.error(getErrorMessage(err))

  const busy = reschedule.isPending || activateNow.isPending || cancel.isPending

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<CalendarClock className="size-4" />} onClick={() => setDialog('reschedule')}>
          Cambiar fecha
        </Button>
        <Button size="sm" icon={<Rocket className="size-4" />} onClick={() => setDialog('activate')}>
          Activar ahora
        </Button>
        <Button variant="ghost" size="sm" icon={<XCircle className="size-4" />} onClick={() => setDialog('cancel')}>
          Cancelar
        </Button>
      </div>

      <Modal
        open={dialog === 'reschedule'}
        onClose={close}
        title="Cambiar fecha de activación"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Volver
            </Button>
            <Button
              loading={reschedule.isPending}
              disabled={!when}
              onClick={() =>
                reschedule.mutate(
                  { id: module.id, scheduledFor: new Date(when).toISOString() },
                  {
                    onSuccess: (m) => {
                      toast.success(`Se activará el ${formatScheduled(m.scheduledFor!)}`)
                      close()
                    },
                    onError,
                  },
                )
              }
            >
              Guardar fecha
            </Button>
          </>
        }
      >
        <Field label="Nueva fecha y hora" htmlFor="reschedule-at" hint="El módulo se activará automáticamente en ese momento.">
          <Input
            id="reschedule-at"
            type="datetime-local"
            min={toLocalInput(new Date())}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={dialog === 'activate'}
        onClose={close}
        title="¿Activar ahora?"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Volver
            </Button>
            <Button
              loading={activateNow.isPending}
              onClick={() =>
                activateNow.mutate(module.id, {
                  onSuccess: (m) => {
                    toast.success(`Módulo "${m.name}" activado`)
                    close()
                  },
                  onError,
                })
              }
            >
              Sí, activar ahora
            </Button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{module.name}</strong> se activará ahora en vez del {formatScheduled(module.scheduledFor!)}.
          {active.data && (
            <>
              {' '}
              El módulo <strong>{active.data.name}</strong> pasará a finalizado (sus datos se conservan y podrás verlos en
              Módulos).
            </>
          )}
        </p>
      </Modal>

      <Modal
        open={dialog === 'cancel'}
        onClose={close}
        title="¿Cancelar la programación?"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Volver
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(module.id, {
                  onSuccess: () => {
                    toast.success('Programación cancelada')
                    close()
                  },
                  onError,
                })
              }
            >
              Sí, cancelar
            </Button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{module.name}</strong> no se activará. Quedará en el historial como cancelado; para usarlo tendrás que
          importarlo de nuevo.
        </p>
      </Modal>
    </>
  )
}
