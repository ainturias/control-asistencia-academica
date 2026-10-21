import { BookOpen, Hash, Info, Mail, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useMyAttendance } from '../../attendance/application/attendance.queries'
import { AttendanceStats, RiskBanner } from '../../attendance/presentation/AttendanceStats'
import { CertificateButton } from '../../attendance/presentation/CertificateButton'
import { useTeacher } from '../../profile/application/profile.queries'
import { teacherDisplayName } from '../../profile/domain/profile'
import { Avatar } from '../../profile/presentation/Avatar'

/** Datos del estudiante (vienen de la lista que cargó el docente) y su avance en el módulo. */
export function StudentProfilePage() {
  const { data, isLoading, error } = useMyAttendance()
  const teacher = useTeacher()

  if (isLoading) return <PageLoader />
  if (error || !data) {
    return (
      <Card>
        <EmptyState icon={<UserRound className="size-6" />} title="No pudimos cargar tu perfil" description={getErrorMessage(error)} />
      </Card>
    )
  }

  const { student, summary, rules } = data
  const percentage = summary.percentage ?? 0

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div aria-hidden className="h-24 bg-linear-to-br from-brand to-deco-violet" />
        <div className="-mt-12 flex flex-col items-center gap-4 px-6 pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar name={student.fullName} photoUrl={null} className="size-24 text-3xl ring-4 ring-surface" />
          <div className="min-w-0 sm:pb-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{student.fullName}</h1>
            <p className="text-sm text-muted">Estudiante · {data.module.name}</p>
          </div>
          <div className="sm:ml-auto sm:pb-1">
            <CertificateButton label="Descargar mi constancia" />
          </div>
        </div>
      </Card>

      <RiskBanner data={data} audience="student" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Mis datos" description="Si algún dato es incorrecto, avisa a tu docente." />
          <dl className="divide-y divide-line">
            <DataRow icon={<Hash className="size-4" />} label="Número de registro" value={student.registrationNumber} />
            <DataRow icon={<Mail className="size-4" />} label="Correo" value={student.email} />
            <DataRow icon={<BookOpen className="size-4" />} label="Módulo" value={data.module.name} />
            <DataRow
              icon={<UserRound className="size-4" />}
              label="Docente"
              value={teacher.data ? teacherDisplayName(teacher.data) : '—'}
            />
            {data.extraFields.map((field) => (
              <DataRow
                key={field.key}
                icon={<Info className="size-4" />}
                label={field.label}
                value={student.extra[field.key] || '—'}
              />
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Mi avance" description={`${summary.completed} de ${summary.total} sesiones completadas`} />
          <div className="space-y-5 p-5">
            <div>
              <div className="flex items-end justify-between">
                <p className="text-sm font-semibold text-muted">Asistencia</p>
                <p className={cn('text-3xl font-extrabold tabular-nums', summary.atRisk ? 'text-alert-ink' : 'text-brand-ink')}>
                  {summary.percentage === null ? '—' : `${summary.percentage}%`}
                </p>
              </div>
              <div className="relative mt-2 h-3 rounded-full bg-canvas">
                <div
                  className={cn('h-full rounded-full', summary.atRisk ? 'bg-alert' : 'bg-brand')}
                  style={{ width: `${percentage}%` }}
                />
                <div
                  className="absolute -top-1 h-5 w-0.5 bg-black/60"
                  style={{ left: `${rules.minAttendancePercentage}%` }}
                  title={`Mínimo ${rules.minAttendancePercentage}%`}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">La línea marca el mínimo del módulo ({rules.minAttendancePercentage}%).</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-canvas p-3">
                <p className="text-2xl font-extrabold tabular-nums">
                  {summary.points}
                  <span className="text-base text-muted"> / {summary.maxPoints}</span>
                </p>
                <p className="text-xs text-muted">Puntos obtenidos</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="text-2xl font-extrabold tabular-nums">{summary.programadas + summary.pendientes}</p>
                <p className="text-xs text-muted">Clases por venir</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AttendanceStats data={data} />
    </div>
  )
}

function DataRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="truncate font-semibold">{value}</dd>
      </div>
    </div>
  )
}
