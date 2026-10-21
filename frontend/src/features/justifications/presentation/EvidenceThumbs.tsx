import { LoadedPhoto, PhotoGallery } from '../../../shared/ui/PhotoGallery'
import { useJustificationImage } from '../application/justifications.queries'
import type { JustificationFile } from '../domain/justification'

/** Pruebas de una justificación. */
export function EvidenceThumbs({
  justificationId,
  files,
  size = 'md',
}: {
  justificationId: number
  files: JustificationFile[]
  size?: 'sm' | 'md'
}) {
  return (
    <PhotoGallery
      ids={files.map((f) => f.id)}
      size={size}
      renderPhoto={(fileId, mode) => <EvidencePhoto justificationId={justificationId} fileId={fileId} mode={mode} />}
    />
  )
}

function EvidencePhoto({ justificationId, fileId, mode }: { justificationId: number; fileId: number; mode: 'thumb' | 'full' }) {
  return <LoadedPhoto query={useJustificationImage(justificationId, fileId)} mode={mode} alt="Prueba de la justificación" />
}
