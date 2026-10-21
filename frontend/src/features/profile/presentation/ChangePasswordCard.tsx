import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { Field, Input } from '../../../shared/ui/Field'
import { useToast } from '../../../shared/ui/toast'
import { useChangePassword } from '../application/profile.queries'

/** Mismas reglas que el servidor, para avisar antes de enviar. */
function passwordProblem(next: string, confirm: string): string | null {
  if (!next) return null
  if (next.length < 8) return 'Debe tener al menos 8 caracteres'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(next) || !/\d/.test(next)) return 'Debe combinar letras y números'
  if (confirm && next !== confirm) return 'La confirmación no coincide'
  return null
}

/** El administrador cambia su propia contraseña confirmando la actual. */
export function ChangePasswordCard() {
  const change = useChangePassword()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const problem = passwordProblem(next, confirm)
  const ready = !!current && !!next && next === confirm && !problem

  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success('Contraseña actualizada. Úsala la próxima vez que ingreses.')
          setCurrent('')
          setNext('')
          setConfirm('')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const type = visible ? 'text' : 'password'
  return (
    <Card>
      <CardHeader
        title="Seguridad"
        description="Cambia tu contraseña de ingreso. Usa al menos 8 caracteres con letras y números."
        actions={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        }
      />
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Contraseña actual" htmlFor="pw-current">
          <Input
            id="pw-current"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            icon={<KeyRound className="size-4" />}
          />
        </Field>
        <Field label="Nueva contraseña" htmlFor="pw-new">
          <Input
            id="pw-new"
            type={type}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            icon={<ShieldCheck className="size-4" />}
          />
        </Field>
        <Field label="Confirmar nueva contraseña" htmlFor="pw-confirm">
          <Input
            id="pw-confirm"
            type={type}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<ShieldCheck className="size-4" />}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
          <p className="text-sm text-alert-ink">{problem}</p>
          <Button type="submit" loading={change.isPending} disabled={!ready}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Card>
  )
}
