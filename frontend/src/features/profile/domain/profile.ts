/** Perfil del administrador, que figura como docente del módulo. */
export interface TeacherProfile {
  id: number
  email: string
  fullName: string
  /** Grado académico, p. ej. "MSc." */
  title: string | null
  phone: string | null
  specialty: string | null
  bio: string | null
  hasPhoto: boolean
}

export type ProfileChanges = Pick<TeacherProfile, 'fullName' | 'title' | 'phone' | 'specialty' | 'bio'>

/** "MSc. Carlos Uscamayta" */
export const teacherDisplayName = (profile: Pick<TeacherProfile, 'title' | 'fullName'>) =>
  [profile.title, profile.fullName].filter(Boolean).join(' ')

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
