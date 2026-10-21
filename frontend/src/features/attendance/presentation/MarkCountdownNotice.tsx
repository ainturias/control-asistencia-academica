import { useQueryClient } from '@tanstack/react-query'
import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import { attendanceKeys } from '../application/attendance.queries'
import type { MarkCountdown } from '../domain/attendance'

type Phase = 'BEFORE' | 'ON_TIME' | 'LATE' | 'ALL_DAY' | 'CLOSED'

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function phaseOf(c: MarkCountdown, elapsed: number): { phase: Phase; seconds: number } {
  const left = (s: number) => Math.max(0, Math.ceil(s - elapsed))
  if (left(c.opensInSeconds) > 0) return { phase: 'BEFORE', seconds: left(c.opensInSeconds) }
  if (c.onTimeEndsInSeconds === null) return { phase: 'ALL_DAY', seconds: left(c.closesInSeconds) }
  if (left(c.onTimeEndsInSeconds) > 0) return { phase: 'ON_TIME', seconds: left(c.onTimeEndsInSeconds) }
  if (left(c.closesInSeconds) > 0) return { phase: 'LATE', seconds: left(c.closesInSeconds) }
  return { phase: 'CLOSED', seconds: 0 }
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatDuration = (total: number) => {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const TEXT: Record<Exclude<Phase, 'CLOSED'>, { label: string; className: string }> = {
  BEFORE: { label: 'El registro se habilita en', className: 'bg-canvas text-ink' },
  ON_TIME: { label: 'Tiempo para marcar como Presente', className: 'bg-brand-soft text-brand-ink' },
  LATE: { label: 'Pasó la tolerancia. Tiempo para marcar con Atraso', className: 'bg-warning-soft text-warning-ink' },
  ALL_DAY: { label: 'Puedes marcar hasta el final del día. Tiempo restante', className: 'bg-brand-soft text-brand-ink' },
}

/**
 * Cuenta regresiva del registro de hoy. Los segundos vienen del servidor (su reloj manda);
 * al cambiar de tramo se vuelve a consultar para habilitar o cerrar el botón.
 */
export function MarkCountdownNotice({ countdown, fetchedAt }: { countdown: MarkCountdown; fetchedAt: number }) {
  const queryClient = useQueryClient()
  const now = useNow(1000)
  const initial = phaseOf(countdown, 0).phase
  const { phase, seconds } = phaseOf(countdown, (now - fetchedAt) / 1000)

  useEffect(() => {
    if (phase !== initial) void queryClient.invalidateQueries({ queryKey: attendanceKeys.mine })
  }, [phase, initial, queryClient])

  if (phase === 'CLOSED') return null
  const text = TEXT[phase]
  return (
    <div className={cn('mt-4 inline-flex items-center gap-3 rounded-xl px-4 py-2.5', text.className)}>
      <Timer className="size-5 shrink-0" />
      <div>
        <p className="text-xs font-semibold opacity-80">{text.label}</p>
        <p className="text-xl font-extrabold tabular-nums">{formatDuration(seconds)}</p>
      </div>
    </div>
  )
}
