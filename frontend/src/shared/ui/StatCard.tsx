import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type Tone = 'brand' | 'teal' | 'alert' | 'accent' | 'warning' | 'info'

const tones: Record<Tone, { box: string; icon: string }> = {
  brand: { box: 'bg-brand-soft text-brand-ink', icon: 'bg-brand text-white' },
  teal: { box: 'bg-teal-soft text-teal-ink', icon: 'bg-teal text-white' },
  alert: { box: 'bg-alert-soft text-alert-ink', icon: 'bg-alert text-white' },
  accent: { box: 'bg-accent-soft text-accent-ink', icon: 'bg-accent text-white' },
  warning: { box: 'bg-warning-soft text-warning-ink', icon: 'bg-warning text-white' },
  info: { box: 'bg-info-soft text-info-ink', icon: 'bg-info text-white' },
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: ReactNode
  tone: Tone
}) {
  return (
    <div className={cn('flex items-center gap-4 rounded-2xl p-4', tones[tone].box)}>
      <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone].icon)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-2xl leading-tight font-extrabold tabular-nums">{value}</p>
        {hint && <p className="truncate text-xs opacity-75">{hint}</p>}
      </div>
    </div>
  )
}
