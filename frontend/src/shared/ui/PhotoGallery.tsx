import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Modal } from './Modal'
import { Spinner } from './Spinner'

/**
 * Miniaturas de fotos; al hacer clic se abren en grande con navegación.
 * `renderPhoto` dibuja cada foto (cada origen carga sus imágenes con su propio token/endpoint).
 */
export function PhotoGallery({
  ids,
  renderPhoto,
  size = 'md',
}: {
  ids: number[]
  renderPhoto: (id: number, mode: 'thumb' | 'full') => ReactNode
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (ids.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ids.map((id, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpen(index)}
            className={cn(
              'overflow-hidden rounded-lg ring-1 ring-line transition hover:ring-2 hover:ring-brand',
              size === 'sm' ? 'size-12' : 'size-20',
            )}
            title="Ver imagen"
          >
            {renderPhoto(id, 'thumb')}
          </button>
        ))}
      </div>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={`Imagen ${(open ?? 0) + 1} de ${ids.length}`} size="lg">
        {open !== null && (
          <div className="space-y-3">
            <div className="grid min-h-64 place-items-center overflow-hidden rounded-xl bg-canvas">{renderPhoto(ids[open], 'full')}</div>
            {ids.length > 1 && (
              <div className="flex justify-between">
                <button
                  type="button"
                  disabled={open === 0}
                  onClick={() => setOpen(open - 1)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={open === ids.length - 1}
                  onClick={() => setOpen(open + 1)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

/** Imagen cargada de forma asíncrona (data URL), con estados de carga y error. */
export function LoadedPhoto({
  query,
  mode,
  alt,
}: {
  query: { data?: string; isLoading: boolean; isError: boolean }
  mode: 'thumb' | 'full'
  alt: string
}) {
  if (query.isLoading) return <Spinner className="m-auto size-4 text-brand" />
  if (query.isError || !query.data) return <ImageOff className="m-auto size-5 text-muted" />
  return (
    <img src={query.data} alt={alt} className={mode === 'full' ? 'max-h-[70vh] w-full object-contain' : 'size-full object-cover'} />
  )
}
