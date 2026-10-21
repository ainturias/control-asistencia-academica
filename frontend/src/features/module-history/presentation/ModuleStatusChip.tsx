import { CalendarClock, CircleCheck, CircleSlash, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Chip, type ChipTone } from '../../../shared/ui/Chip'
import { MODULE_STATUS_LABELS, type ModuleStatus } from '../../academic-modules/domain/academic-module'

const META: Record<ModuleStatus, { tone: ChipTone; icon: ReactNode }> = {
  ACTIVE: { tone: 'teal', icon: <CircleCheck className="size-3.5" /> },
  SCHEDULED: { tone: 'info', icon: <CalendarClock className="size-3.5" /> },
  CLOSED: { tone: 'neutral', icon: <Lock className="size-3.5" /> },
  CANCELLED: { tone: 'outline', icon: <CircleSlash className="size-3.5" /> },
}

export function ModuleStatusChip({ status }: { status: ModuleStatus }) {
  return (
    <Chip tone={META[status].tone} icon={META[status].icon}>
      {MODULE_STATUS_LABELS[status]}
    </Chip>
  )
}
