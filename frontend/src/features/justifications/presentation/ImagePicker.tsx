import { ImagePlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { IMAGE_TYPES, MAX_FILES } from '../domain/justification'

interface Picked {
  file: File
  preview: string
}

const readPreview = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })

/** Selector de imágenes (por defecto hasta 4), con vista previa y opción de quitar cada una. */
export function ImagePicker({
  files,
  onChange,
  max = MAX_FILES,
}: {
  files: File[]
  onChange: (files: File[]) => void
  max?: number
}) {
  const id = useId()
  const [picked, setPicked] = useState<Picked[]>([])
  // Si el formulario se reinicia desde afuera, también se limpian las vistas previas.
  const shown = picked.filter((p) => files.includes(p.file))

  const add = async (list: FileList | null) => {
    if (!list) return
    const incoming = [...list].slice(0, max - shown.length)
    const next = [...shown, ...(await Promise.all(incoming.map(async (file) => ({ file, preview: await readPreview(file) }))))]
    setPicked(next)
    onChange(next.map((p) => p.file))
  }

  const remove = (file: File) => {
    const next = shown.filter((p) => p.file !== file)
    setPicked(next)
    onChange(next.map((p) => p.file))
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shown.map(({ file, preview }) => (
          <div key={preview} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
            <img src={preview} alt={file.name} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(file)}
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label={`Quitar ${file.name}`}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {shown.length < max && (
          <label
            htmlFor={id}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-center text-xs font-semibold text-muted transition hover:border-brand/50 hover:text-brand"
          >
            <ImagePlus className="size-6" />
            Agregar imagen
            <span className="font-normal">
              {shown.length}/{max}
            </span>
          </label>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="mt-2 text-xs text-muted">Hasta {max} imágenes JPG, PNG o WEBP de máximo 3 MB cada una.</p>
    </div>
  )
}
