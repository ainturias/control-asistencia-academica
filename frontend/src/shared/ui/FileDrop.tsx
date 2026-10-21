import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { cn } from '../lib/cn'

export function FileDrop({
  label,
  hint,
  file,
  onChange,
  tone = 'brand',
}: {
  label: string
  hint: string
  file: File | null
  onChange: (file: File | null) => void
  tone?: 'brand' | 'teal'
}) {
  const id = useId()
  const [dragging, setDragging] = useState(false)

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onChange(dropped)
  }

  const accent = tone === 'brand' ? 'text-brand bg-brand-soft' : 'text-teal bg-teal-soft'

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <div className={cn('grid size-10 place-items-center rounded-lg', accent)}>
            <FileSpreadsheet className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label={`Quitar ${file.name}`}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition',
            dragging ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-brand/50 hover:bg-canvas',
          )}
        >
          <div className={cn('grid size-10 place-items-center rounded-lg', accent)}>
            <Upload className="size-5" />
          </div>
          <span className="text-sm font-semibold">Arrastra el archivo o haz clic</span>
          <span className="text-xs text-muted">{hint}</span>
        </label>
      )}
      <input
        id={id}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}
