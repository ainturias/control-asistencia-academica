import { cn } from '../../../shared/lib/cn'
import { initials } from '../domain/profile'

/** Foto de la persona o sus iniciales si no tiene una. */
export function Avatar({ name, photoUrl, className }: { name: string; photoUrl: string | null; className?: string }) {
  return photoUrl ? (
    <img src={photoUrl} alt={`Foto de ${name}`} className={cn('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <div
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent-ink', className)}
    >
      {initials(name)}
    </div>
  )
}
