import { Hash, Mail, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { Field, Input } from '../../../shared/ui/Field'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import type { ExtraField } from '../../academic-modules/domain/academic-module'
import { useStudentMutations } from '../application/students.queries'
import type { Student, StudentInput } from '../domain/student'

/** Agregar un estudiante al módulo activo o corregir sus datos (incluidos los campos adicionales). */
export function StudentFormDialog({
  target,
  fields,
  onClose,
}: {
  target: Student | 'new' | null
  fields: ExtraField[]
  onClose: () => void
}) {
  return (
    <Modal open={target !== null} onClose={onClose} title={target === 'new' ? 'Agregar estudiante' : 'Editar estudiante'} size="lg">
      {target && (
        <StudentForm key={target === 'new' ? 'new' : target.id} student={target === 'new' ? null : target} fields={fields} onClose={onClose} />
      )}
    </Modal>
  )
}

function StudentForm({ student, fields, onClose }: { student: Student | null; fields: ExtraField[]; onClose: () => void }) {
  const { create, update } = useStudentMutations()
  const toast = useToast()
  const [form, setForm] = useState<StudentInput>({
    registrationNumber: student?.registrationNumber ?? '',
    fullName: student?.fullName ?? '',
    email: student?.email ?? '',
    extra: { ...(student?.extra ?? {}) },
  })
  const pending = create.isPending || update.isPending
  const loginChanged =
    student !== null && (form.registrationNumber.trim() !== student.registrationNumber || form.email.trim().toLowerCase() !== student.email)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const options = {
      onSuccess: (saved: Student) => {
        toast.success(student ? `Datos de ${saved.fullName} actualizados` : `${saved.fullName} agregado al módulo`)
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    if (student) update.mutate({ id: student.id, input: form }, options)
    else create.mutate(form, options)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Número de registro" htmlFor="st-registration">
          <Input
            id="st-registration"
            required
            maxLength={30}
            value={form.registrationNumber}
            onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            icon={<Hash className="size-4" />}
          />
        </Field>
        <Field label="Nombre completo" htmlFor="st-name">
          <Input
            id="st-name"
            required
            maxLength={150}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            icon={<UserRound className="size-4" />}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Correo electrónico" htmlFor="st-email">
            <Input
              id="st-email"
              type="email"
              required
              maxLength={150}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              icon={<Mail className="size-4" />}
            />
          </Field>
        </div>
        {fields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            htmlFor={`st-extra-${field.key}`}
            hint={field.visibleToStudent ? 'Visible para el estudiante' : 'Solo lo ve el administrador'}
          >
            <Input
              id={`st-extra-${field.key}`}
              maxLength={300}
              value={form.extra[field.key] ?? ''}
              onChange={(e) => setForm({ ...form, extra: { ...form.extra, [field.key]: e.target.value } })}
            />
          </Field>
        ))}
      </div>

      {loginChanged && (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          Cambiaste el registro o el correo: el estudiante deberá ingresar con el dato nuevo.
        </p>
      )}
      <p className="text-xs text-muted">El cambio queda registrado en Actividades con los valores anteriores y nuevos.</p>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {student ? 'Guardar cambios' : 'Agregar estudiante'}
        </Button>
      </div>
    </form>
  )
}
