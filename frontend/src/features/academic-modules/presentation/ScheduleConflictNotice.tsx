import { CalendarCheck2, TriangleAlert } from 'lucide-react'
import { formatDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { formatScheduled } from '../../module-history/presentation/schedule-format'
import type { ScheduleConflicts } from '../domain/schedule-conflicts'

/** Avisa si la activación programada choca con las fechas del módulo activo o del nuevo. */
export function ScheduleConflictNotice({
  conflicts,
  activeName,
  newName,
  onUseSuggestion,
}: {
  conflicts: ScheduleConflicts
  activeName: string | null
  newName: string
  onUseSuggestion?: (value: string) => void
}) {
  const { activeRemaining, newBefore, suggestion, activeLast } = conflicts
  if (!activeRemaining && !newBefore) {
    return activeName && activeLast ? (
      <p className="flex items-start gap-2 rounded-xl bg-teal-soft px-4 py-3 text-sm text-teal-ink">
        <CalendarCheck2 className="mt-0.5 size-4 shrink-0" />
        Sin choques: {activeName} termina sus clases el {formatDate(activeLast)}, antes de la activación.
      </p>
    ) : null
  }

  return (
    <div className="space-y-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">
      <p className="flex items-center gap-2 font-bold">
        <TriangleAlert className="size-4 shrink-0" /> Las fechas se superponen
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {activeRemaining && activeName && (
          <li>
            Choca con el módulo <strong>{activeName}</strong>: todavía tiene{' '}
            <strong>
              {activeRemaining.count} {activeRemaining.count === 1 ? 'clase' : 'clases'}
            </strong>{' '}
            desde el {formatDate(activeRemaining.first)} hasta el {formatDate(activeRemaining.last)}. Al activarse el nuevo
            módulo, esas clases ya no se registrarán en el sistema.
          </li>
        )}
        {newBefore && (
          <li>
            <strong>
              {newBefore.count} {newBefore.count === 1 ? 'clase' : 'clases'}
            </strong>{' '}
            de {newName || 'el nuevo módulo'} ({formatDate(newBefore.first)}
            {newBefore.count > 1 && ` al ${formatDate(newBefore.last)}`}) son anteriores a la activación: sus estudiantes no podrán
            marcar y quedarán como falta.
          </li>
        )}
      </ul>
      {suggestion && onUseSuggestion && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span>Sugerencia sin choques: {formatScheduled(new Date(suggestion).toISOString())}.</span>
          <Button size="sm" variant="secondary" onClick={() => onUseSuggestion(suggestion)}>
            Usar esta fecha
          </Button>
        </div>
      )}
      {!suggestion && activeRemaining && newBefore && (
        <p>Las clases de ambos módulos se cruzan; revisa las fechas del Excel o las del módulo actual en Calendario.</p>
      )}
    </div>
  )
}
