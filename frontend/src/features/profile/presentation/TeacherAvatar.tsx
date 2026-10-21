import { useProfilePhotoUrl } from '../application/profile.queries'
import { Avatar } from './Avatar'

/** Foto del administrador que ingresó (su propio perfil). */
export function TeacherAvatar({ name, className }: { name: string; className?: string }) {
  return <Avatar name={name} photoUrl={useProfilePhotoUrl()} className={className} />
}
