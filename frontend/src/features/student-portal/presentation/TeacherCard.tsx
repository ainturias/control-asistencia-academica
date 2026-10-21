import { GraduationCap, Mail, Phone } from 'lucide-react'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { teacherDisplayName, type TeacherProfile } from '../../profile/domain/profile'
import { Avatar } from '../../profile/presentation/Avatar'

/** Perfil público del docente del módulo. */
export function TeacherCard({ teacher, photoUrl }: { teacher: TeacherProfile | null; photoUrl: string | null }) {
  return (
    <Card>
      <CardHeader title="Docente" />
      {teacher ? (
        <div className="p-5">
          <div className="flex items-center gap-4">
            <Avatar name={teacher.fullName} photoUrl={photoUrl} className="size-20 text-2xl" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold">{teacherDisplayName(teacher)}</p>
              {teacher.specialty && (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <GraduationCap className="size-4 shrink-0" /> {teacher.specialty}
                </p>
              )}
            </div>
          </div>
          {teacher.bio && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted">{teacher.bio}</p>}
          <div className="mt-4 space-y-2 text-sm">
            <a href={`mailto:${teacher.email}`} className="flex items-center gap-2 break-all text-brand hover:underline">
              <Mail className="size-4 shrink-0" /> {teacher.email}
            </a>
            {teacher.phone && (
              <a href={`tel:${teacher.phone}`} className="flex items-center gap-2 text-brand hover:underline">
                <Phone className="size-4 shrink-0" /> {teacher.phone}
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="p-5 text-sm text-muted">El módulo todavía no tiene un docente asignado.</p>
      )}
    </Card>
  )
}
