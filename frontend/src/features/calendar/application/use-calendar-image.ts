import { toCanvas } from 'html-to-image'
import { useRef } from 'react'

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const calendarFileName = (moduleName: string) => `calendario-${slug(moduleName)}.jpg`

export interface CalendarImage {
  /** JPG: lo que se descarga y se comparte. */
  file: File
  url: string
  /** PNG: los navegadores solo permiten copiar imágenes al portapapeles en este formato. */
  png: Blob
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))), type, quality),
  )

/** Referencia a la tarjeta del calendario y función para convertirla en imagen (JPG y PNG). */
export function useCalendarImage(fileName: string) {
  const ref = useRef<HTMLDivElement>(null)

  const render = async (): Promise<CalendarImage> => {
    if (!ref.current) throw new Error('El calendario todavía no está listo')
    // Fondo del tema actual, para que la imagen en modo oscuro no tenga bordes blancos.
    const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim() || '#ffffff'
    const canvas = await toCanvas(ref.current, {
      pixelRatio: 2,
      backgroundColor,
      cacheBust: true,
      // Los controles (flechas de mes) no van en la imagen.
      filter: (node) => !(node instanceof HTMLElement && 'exportHide' in node.dataset),
    })
    const [jpg, png] = await Promise.all([toBlob(canvas, 'image/jpeg', 0.92), toBlob(canvas, 'image/png')])
    return { file: new File([jpg], fileName, { type: 'image/jpeg' }), url: URL.createObjectURL(jpg), png }
  }

  return { ref, fileName, render }
}

export type CalendarImageSource = ReturnType<typeof useCalendarImage>
