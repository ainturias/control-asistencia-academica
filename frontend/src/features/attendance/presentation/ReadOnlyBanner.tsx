import { Lock } from 'lucide-react'

/** Aviso para las vistas de módulos del historial, que no se pueden modificar. */
export function ReadOnlyBanner({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
        <Lock className="size-4" />
      </span>
      <div className="text-sm">
        <p className="font-bold">Estás viendo un módulo que no está activo — solo lectura</p>
        <p className="text-muted">
          Los datos de <strong className="text-ink">{moduleName}</strong> se conservan tal como quedaron; no se pueden modificar.
        </p>
      </div>
    </div>
  )
}
