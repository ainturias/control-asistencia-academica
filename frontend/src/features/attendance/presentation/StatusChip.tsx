import { AlarmClock, Ban, CalendarClock, Check, Clock3, FileCheck2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Chip, type ChipTone } from '../../../shared/ui/Chip'
import { STATUS_LABELS, type AttendanceStatus } from '../domain/attendance'

/** Presente en índigo y Falta en naranja: se distinguen también con daltonismo. */
const META: Record<AttendanceStatus, { tone: ChipTone; icon: ReactNode }> = {
  PRESENTE: { tone: 'brand', icon: <Check className="size-3.5" strokeWidth={3} /> },
  ATRASO: { tone: 'warning', icon: <AlarmClock className="size-3.5" /> },
  FALTA: { tone: 'alert', icon: <X className="size-3.5" strokeWidth={3} /> },
  JUSTIFICADO: { tone: 'info', icon: <FileCheck2 className="size-3.5" /> },
  PENDIENTE: { tone: 'teal', icon: <Clock3 className="size-3.5" /> },
  PROGRAMADA: { tone: 'outline', icon: <CalendarClock className="size-3.5" /> },
  CANCELADA: { tone: 'neutral', icon: <Ban className="size-3.5" /> },
}

export function StatusChip({ status, compact = false }: { status: AttendanceStatus; compact?: boolean }) {
  const meta = META[status]
  const label = STATUS_LABELS[status]
  return (
    <Chip tone={meta.tone} icon={meta.icon} className={compact ? 'px-1.5' : undefined}>
      {compact ? <span className="sr-only">{label}</span> : label}
    </Chip>
  )
}
