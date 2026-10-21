import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Field'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import { useUpdateExtraFields } from '../../academic-modules/application/academic-modules.queries'
import type { ExtraField } from '../../academic-modules/domain/academic-module'

/** Renombrar, mostrar/ocultar al estudiante, agregar o quitar campos adicionales del módulo activo. */
export function ExtraFieldsDialog({ open, fields, onClose }: { open: boolean; fields: ExtraField[]; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Campos adicionales" size="lg">
      {open && <FieldsEditor initial={fields} onClose={onClose} />}
    </Modal>
  )
}

function FieldsEditor({ initial, onClose }: { initial: ExtraField[]; onClose: () => void }) {
  const [fields, setFields] = useState<ExtraField[]>(initial)
  const update = useUpdateExtraFields()
  const toast = useToast()
  const set = (index: number, patch: Partial<ExtraField>) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))

  const save = () =>
    update.mutate(
      fields.filter((f) => f.label.trim()),
      {
        onSuccess: () => {
          toast.success('Campos adicionales actualizados')
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Datos extra de los estudiantes (teléfono, carrera, CI…). Quitar un campo solo lo oculta: los valores guardados no se
        borran.
      </p>

      {fields.length === 0 ? (
        <p className="rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">Este módulo no tiene campos adicionales.</p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.key || `new-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
              <Input
                aria-label="Nombre del campo"
                placeholder="Nombre del campo"
                maxLength={60}
                value={field.label}
                onChange={(e) => set(index, { label: e.target.value })}
                className="h-10 min-w-48 flex-1"
              />
              <button
                type="button"
                onClick={() => set(index, { visibleToStudent: !field.visibleToStudent })}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold whitespace-nowrap ring-1 transition',
                  field.visibleToStudent ? 'bg-teal-soft text-teal-ink ring-teal/30' : 'bg-canvas text-muted ring-line',
                )}
              >
                {field.visibleToStudent ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                {field.visibleToStudent ? 'Visible para el estudiante' : 'Solo administrador'}
              </button>
              <button
                type="button"
                onClick={() => setFields(fields.filter((_, i) => i !== index))}
                className="grid size-10 place-items-center rounded-xl text-muted hover:bg-alert-soft hover:text-alert-ink"
                title="Quitar campo"
                aria-label="Quitar campo"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="secondary"
        size="sm"
        icon={<Plus className="size-4" />}
        onClick={() => setFields([...fields, { key: '', label: '', visibleToStudent: false }])}
      >
        Agregar campo
      </Button>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button onClick={save} loading={update.isPending}>
          Guardar campos
        </Button>
      </div>
    </div>
  )
}
