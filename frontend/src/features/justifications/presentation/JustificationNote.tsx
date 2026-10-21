import { FileClock, FileCheck2, FileX2, Paperclip } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../../shared/lib/cn'
import { Button } from '../../../shared/ui/Button'
import { STATUS_LABELS } from '../../attendance/domain/attendance'
import { JUSTIFICATION_STATUS_LABELS, type Justification } from '../domain/justification'

const TONES = {
  PENDING: { className: 'bg-info-soft text-info-ink', icon: FileClock },
  APPROVED: { className: 'bg-teal-soft text-teal-ink', icon: FileCheck2 },
  REJECTED: { className: 'bg-alert-soft text-alert-ink', icon: FileX2 },
}

/**
 * Estado de la justificación de una sesión dentro del historial. Para el estudiante incluye el botón
 * "Justificar"; para el admin, un enlace a la bandeja de justificaciones.
 */
export function JustificationNote({
  justification,
  canJustify = false,
  onJustify,
  adminLink = false,
}: {
  justification: Justification | undefined
  canJustify?: boolean
  onJustify?: () => void
  adminLink?: boolean
}) {
  if (!justification) {
    return canJustify && onJustify ? (
      <Button size="sm" variant="secondary" icon={<Paperclip className="size-3.5" />} onClick={onJustify}>
        Justificar
      </Button>
    ) : null
  }

  const tone = TONES[justification.status]
  const Icon = tone.icon
  const label =
    justification.origin === 'ADMIN'
      ? 'Pruebas adjuntadas por el docente'
      : `Justificación ${JUSTIFICATION_STATUS_LABELS[justification.status].toLowerCase()}`

  return (
    <div className="space-y-1.5">
      <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold', tone.className)}>
        <Icon className="size-3.5" />
        {label}
        {justification.status === 'APPROVED' && justification.resolvedStatus && ` · ${STATUS_LABELS[justification.resolvedStatus]}`}
      </span>
      {justification.reviewComment && <p className="text-xs">Docente: “{justification.reviewComment}”</p>}
      {canJustify && onJustify && (
        <Button size="sm" variant="secondary" icon={<Paperclip className="size-3.5" />} onClick={onJustify}>
          Enviar otra justificación
        </Button>
      )}
      {adminLink && (
        <Link
          to={`/admin/justificaciones?estado=${justification.status === 'PENDING' ? 'pendientes' : justification.status === 'APPROVED' ? 'aprobadas' : 'rechazadas'}`}
          className="block text-xs font-semibold text-brand hover:underline"
        >
          Ver justificación
        </Link>
      )}
    </div>
  )
}
