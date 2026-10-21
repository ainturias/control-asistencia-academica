import { ArrowLeft, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useJustifications } from '../../justifications/application/justifications.queries'
import { JustificationNote } from '../../justifications/presentation/JustificationNote'
import { useStudentAttendance } from '../application/attendance.queries'
import { AttendanceHistoryTable } from './AttendanceHistoryTable'
import { AttendanceStats, RiskBanner } from './AttendanceStats'
import { EditAttendanceDialog, type EditTarget } from './EditAttendanceDialog'
import { CertificateButton } from './CertificateButton'
import { ReadOnlyBanner } from './ReadOnlyBanner'

/** Detalle de asistencia de un estudiante para el administrador, con edición por sesión. */
export function StudentAttendancePage() {
  const params = useParams()
  const studentId = Number(params.studentId)
  // Dentro del historial (/admin/modulos/:moduleId/...) se ve otro módulo, en solo lectura.
  const moduleId = params.moduleId ? Number(params.moduleId) : undefined
  const { data, isLoading, error } = useStudentAttendance(studentId, moduleId)
  const readOnly = !!data && data.module.status !== 'ACTIVE'
  const justifications = useJustifications({ studentId, moduleId }, Number.isInteger(studentId))
  const backTo = moduleId ? `/admin/modulos/${moduleId}?tab=estudiantes` : '/admin/asistencias'
  const [editing, setEditing] = useState<EditTarget | null>(null)

  if (isLoading) return <PageLoader />
  if (error || !data) {
    return (
      <Card>
        <EmptyState
          icon={<UserRound className="size-6" />}
          title="No encontramos al estudiante"
          description={getErrorMessage(error)}
          action={
            <Link to="/admin/estudiantes">
              <Button variant="secondary">Volver a estudiantes</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const { student } = data
  return (
    <div className="space-y-6">
      <div>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {moduleId ? data.module.name : 'Asistencias'}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="order-last ml-auto sm:order-none">
            <CertificateButton studentId={student.id} moduleId={moduleId} />
          </div>
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-lg font-extrabold text-brand-ink">
            {student.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{student.fullName}</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <span>Reg. {student.registrationNumber}</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" /> {student.email}
              </span>
            </p>
            {data.extraFields.some((f) => student.extra[f.key]) && (
              <dl className="mt-2 flex flex-wrap gap-2 text-xs">
                {data.extraFields
                  .filter((f) => student.extra[f.key])
                  .map((f) => (
                    <div key={f.key} className="rounded-lg bg-canvas px-2.5 py-1 ring-1 ring-line">
                      <dt className="inline text-muted">{f.label}: </dt>
                      <dd className="inline font-semibold">{student.extra[f.key]}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {readOnly && <ReadOnlyBanner moduleName={data.module.name} />}
      <RiskBanner data={data} audience="admin" />
      <AttendanceStats data={data} />

      <Card>
        <CardHeader
          title="Historial de asistencia"
          description={readOnly ? 'Módulo finalizado: solo lectura.' : 'Haz clic en un estado para modificarlo. El cambio queda auditado.'}
        />
        <AttendanceHistoryTable
          records={data.records}
          today={data.today}
          onEdit={readOnly ? undefined : (record) => setEditing({ student, record })}
          renderExtra={(record) => (
            <JustificationNote
              justification={justifications.data?.items.find((j) => j.sessionId === record.sessionId)}
              adminLink={!readOnly}
            />
          )}
        />
      </Card>

      {!readOnly && <EditAttendanceDialog target={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
