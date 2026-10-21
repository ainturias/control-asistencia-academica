import { LoadedPhoto, PhotoGallery } from '../../../shared/ui/PhotoGallery'
import { useChangePhoto } from '../application/sessions.queries'
import type { SessionChange } from '../domain/session-change'

/** Fotos adjuntas a un cambio de clase (comunicado, aviso, etc.). */
export function ChangePhotos({ change, size = 'md' }: { change: SessionChange; size?: 'sm' | 'md' }) {
  return (
    <PhotoGallery
      ids={change.files.map((f) => f.id)}
      size={size}
      renderPhoto={(fileId, mode) => <ChangePhoto changeId={change.id} fileId={fileId} mode={mode} />}
    />
  )
}

function ChangePhoto({ changeId, fileId, mode }: { changeId: number; fileId: number; mode: 'thumb' | 'full' }) {
  return <LoadedPhoto query={useChangePhoto(changeId, fileId)} mode={mode} alt="Foto del cambio de clase" />
}
