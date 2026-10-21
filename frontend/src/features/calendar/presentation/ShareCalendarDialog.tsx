import { Check, Copy, Download, Mail, Share2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { Modal } from '../../../shared/ui/Modal'
import { Spinner } from '../../../shared/ui/Spinner'
import type { CalendarImage, CalendarImageSource } from '../application/use-calendar-image'

const canCopyImages = () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write

/**
 * Compartir el calendario como imagen JPG. En celulares se usa el menú nativo, que adjunta la imagen
 * directamente. En computadora las páginas web no pueden adjuntar archivos a WhatsApp, Facebook o al
 * correo: se copia la imagen, se abre el destino y se indica pegarla con Ctrl+V.
 */
export function ShareCalendarDialog({
  open,
  onClose,
  source,
  text,
}: {
  open: boolean
  onClose: () => void
  source: CalendarImageSource
  text: string
}) {
  return (
    <Modal open={open} onClose={onClose} title="Compartir calendario" size="lg">
      {open && <ShareContent source={source} text={text} />}
    </Modal>
  )
}

function ShareContent({ source, text }: { source: CalendarImageSource; text: string }) {
  const [image, setImage] = useState<CalendarImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string[] | null>(null)
  // Por defecto solo va la imagen (que ya trae toda la información) con una leyenda corta.
  const [includeText, setIncludeText] = useState(false)
  const caption = text.split('\n')[0].replace(/\*/g, '')
  const message = includeText ? text : caption
  // Se fija la fuente del primer render: el hook devuelve un objeto nuevo en cada render.
  const [initialSource] = useState(source)

  // La imagen se genera al abrir, para que cada botón actúe dentro del mismo clic
  // (los navegadores solo permiten copiar al portapapeles en respuesta directa al usuario).
  useEffect(() => {
    let current: CalendarImage | null = null
    let cancelled = false
    initialSource
      .render()
      .then((result) => {
        current = result
        if (cancelled) URL.revokeObjectURL(result.url)
        else setImage(result)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
    return () => {
      cancelled = true
      if (current) URL.revokeObjectURL(current.url)
    }
  }, [initialSource])

  const download = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.file.name
    link.click()
  }

  const canShareFile = !!image && !!navigator.canShare?.({ files: [image.file] })

  /** Menú nativo (celulares): la imagen se adjunta directamente en la app que se elija. */
  const nativeShare = () =>
    void navigator.share({ files: [image!.file], text: message, title: caption }).catch(() => undefined)

  /** Copia la imagen y explica cómo pegarla; si el navegador no puede copiar, la descarga para adjuntarla. */
  const copyImage = async (destination: string, steps: string[]) => {
    if (!image) return
    try {
      if (!canCopyImages()) throw new Error('sin soporte')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image.png })])
      setNotice([`La imagen ya está copiada.`, ...steps, `Pega la imagen con Ctrl+V y envíala.`])
    } catch {
      download()
      setNotice([
        `Tu navegador no permite copiar imágenes: se descargó ${image.file.name}.`,
        ...steps,
        `Adjunta el archivo descargado (clip o "Adjuntar") en ${destination} y envíalo.`,
      ])
    }
  }

  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

  const options: { label: string; icon: ReactNode; className: string; onClick: () => void; hidden?: boolean }[] = [
    {
      label: 'Más opciones',
      icon: <Share2 className="size-5" />,
      className: 'bg-brand text-white',
      hidden: !canShareFile,
      onClick: nativeShare,
    },
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      className: 'bg-[#25D366] text-white',
      onClick: () => {
        if (canShareFile) return nativeShare()
        void copyImage('WhatsApp', ['Se abrió WhatsApp: elige el chat o grupo.'])
        openUrl(`https://wa.me/?text=${encodeURIComponent(message)}`)
      },
    },
    {
      label: 'Correo',
      icon: <Mail className="size-5" />,
      className: 'bg-alert text-white',
      onClick: () => {
        if (canShareFile) return nativeShare()
        void copyImage('el correo', ['Se abrió tu programa de correo con el asunto listo.'])
        window.location.assign(`mailto:?subject=${encodeURIComponent(caption)}&body=${encodeURIComponent(message)}`)
      },
    },
    {
      label: 'Facebook',
      icon: <FacebookIcon />,
      className: 'bg-[#1877F2] text-white',
      onClick: () => {
        if (canShareFile) return nativeShare()
        void copyImage('Facebook', ['Se abrió Facebook: crea una publicación o abre el chat.'])
        openUrl('https://www.facebook.com/')
      },
    },
    {
      label: 'Copiar imagen',
      icon: <Copy className="size-5" />,
      className: 'bg-canvas text-ink ring-1 ring-line',
      onClick: () => void copyImage('el chat o documento', ['Abre el chat o documento donde quieras compartirla.']),
    },
    {
      label: 'Descargar',
      icon: <Download className="size-5" />,
      className: 'bg-canvas text-ink ring-1 ring-line',
      onClick: download,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid min-h-40 place-items-center overflow-hidden rounded-xl border border-line bg-canvas">
        {image ? (
          <img src={image.url} alt="Vista previa del calendario (JPG)" className="max-h-72 w-full object-contain" />
        ) : error ? (
          <p className="p-6 text-center text-sm text-alert-ink">{error}</p>
        ) : (
          <div className="flex items-center gap-3 p-6 text-sm text-muted">
            <Spinner className="size-5 text-brand" /> Preparando imagen…
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {options
          .filter((option) => !option.hidden)
          .map((option) => (
            <button
              key={option.label}
              type="button"
              disabled={!image}
              onClick={option.onClick}
              className="group flex flex-col items-center gap-2 rounded-xl p-2 text-xs font-semibold text-ink transition hover:bg-canvas disabled:opacity-40"
            >
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-full shadow-sm transition group-hover:scale-105',
                  option.className,
                )}
              >
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl bg-teal-soft px-4 py-3 text-sm text-teal-ink">
          <Check className="mt-0.5 size-4 shrink-0" />
          <ol className="list-inside list-decimal space-y-0.5">
            {notice.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-line px-4 py-3 text-sm">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={includeText}
            onChange={(e) => setIncludeText(e.target.checked)}
            className="size-4 accent-brand"
          />
          Enviar también el texto con las fechas y el horario
        </label>
        <p className="mt-1 text-xs text-muted">
          La imagen ya incluye toda la información. Si lo marcas, además se escribe el detalle como texto.
        </p>
        <pre className="mt-3 font-sans whitespace-pre-wrap text-muted">{message}</pre>
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  )
}
