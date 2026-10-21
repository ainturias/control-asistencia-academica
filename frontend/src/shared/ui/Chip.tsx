import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ChipTone = 'brand' | 'teal' | 'alert' | 'accent' | 'warning' | 'info' | 'neutral' | 'outline'

const tones: Record<ChipTone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  teal: 'bg-teal-soft text-teal-ink',
  alert: 'bg-alert-soft text-alert-ink',
  accent: 'bg-accent-soft text-accent-ink',
  warning: 'bg-warning-soft text-warning-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-canvas text-muted',
  outline: 'border border-dashed border-line text-muted',
}

export function Chip({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: ChipTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
