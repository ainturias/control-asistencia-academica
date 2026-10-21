import { Fingerprint, Hourglass, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatTime } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { useToast } from '../../../shared/ui/toast'
import { useMarkAttendance } from '../application/attendance.queries'
import type { MyAttendance } from '../domain/attendance'

/**
 * Botón para marcar la asistencia de hoy. Si el módulo pide código de clase:
 * - mientras el docente no lo publica, avisa que hay que esperarlo;
 * - cuando lo publica (llega en tiempo real), muestra el campo para escribirlo y enviarlo.
 * `compact`: versión pequeña para la fila de hoy del historial.
 */
export function MarkAttendanceControl({ data, compact = false }: { data: MyAttendance; compact?: boolean }) {
  const mark = useMarkAttendance()
  const toast = useToast()
  const [code, setCode] = useState('')

  const markWindow = data.markWindow
  const needsCode = data.rules.requireClassCode
  const waitingCode = needsCode && !data.todayCodePublished
  const tooEarly = !data.canMarkToday && markWindow !== null
  const codeReady = code.trim().length >= 4

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!data.canMarkToday || waitingCode || (needsCode && !codeReady)) return
    mark.mutate(needsCode ? code.trim() : undefined, {
      onSuccess: (result) =>
        toast.success(
          result.status === 'ATRASO'
            ? `Asistencia registrada con atraso a las ${formatTime(result.markedAt!)}`
            : `¡Listo! Asistencia registrada a las ${formatTime(result.markedAt!)}`,
        ),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const align = compact ? 'items-start' : 'md:items-end'
  const textAlign = compact ? '' : 'md:text-right'

  if (tooEarly) {
    return (
      <Button size={compact ? 'sm' : 'lg'} disabled icon={<Fingerprint className={compact ? 'size-4' : 'size-5'} />} className={cn(!compact && 'w-full md:w-auto')}>
        Se habilita a las {markWindow.opensAt}
      </Button>
    )
  }

  if (waitingCode) {
    return (
      <div className={cn('flex flex-col gap-1.5', align)}>
        <Button size={compact ? 'sm' : 'lg'} disabled icon={<Hourglass className={compact ? 'size-4' : 'size-5'} />} className={cn(!compact && 'w-full md:w-auto')}>
          Esperando el código
        </Button>
        <p className={cn('max-w-xs text-xs text-muted', textAlign)}>
          Tu docente todavía no publicó el código de esta clase. Cuando lo haga, aquí aparecerá el campo para escribirlo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-2', align)}>
      {needsCode && (
        <label className={cn('block', compact ? 'w-full max-w-56' : 'w-full md:w-56')}>
          <span className={cn('mb-1 block font-semibold', compact ? 'text-xs' : 'text-sm', textAlign)}>Código de la clase</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
            maxLength={8}
            inputMode="text"
            autoComplete="off"
            placeholder="Ej.: AB12CD"
            aria-label="Código de la clase"
            className={cn(
              'w-full rounded-xl border border-line bg-surface px-3 text-center font-bold tracking-[0.3em] focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none',
              compact ? 'h-9 text-sm' : 'h-12 text-lg',
            )}
          />
        </label>
      )}
      <Button
        type="submit"
        size={compact ? 'sm' : 'lg'}
        loading={mark.isPending}
        disabled={!data.canMarkToday || (needsCode && !codeReady)}
        icon={needsCode ? <Send className={compact ? 'size-4' : 'size-5'} /> : <Fingerprint className={compact ? 'size-4' : 'size-5'} />}
        className={cn(!compact && 'w-full md:w-auto')}
      >
        {needsCode ? 'Enviar código y marcar' : 'Marcar asistencia'}
      </Button>
      {needsCode && !compact && <p className={cn('text-xs text-muted', textAlign)}>Escribe el código que tu docente compartió en la clase.</p>}
    </form>
  )
}
