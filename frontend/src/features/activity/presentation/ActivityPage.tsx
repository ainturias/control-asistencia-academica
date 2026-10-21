import { ChevronLeft, ChevronRight, History, X } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { Chip, type ChipTone } from '../../../shared/ui/Chip'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Input, Select } from '../../../shared/ui/Field'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useStudents } from '../../students/application/students.queries'
import { useActivity } from '../application/activity.queries'
import { actionLabel, type ActivityAction } from '../domain/activity'

const ACTION_TONES: Record<ActivityAction, ChipTone> = {
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  MARK_ATTENDANCE: 'brand',
  EDIT_ATTENDANCE: 'accent',
  ACTIVATE_MODULE: 'teal',
  EXPORT_ATTENDANCE: 'neutral',
  UPDATE_RULES: 'warning',
  SCHEDULE_MODULE: 'info',
  CANCEL_SCHEDULE: 'neutral',
  UPDATE_FIELDS: 'info',
  ADD_STUDENT: 'teal',
  EDIT_STUDENT: 'accent',
  DEACTIVATE_STUDENT: 'alert',
  REACTIVATE_STUDENT: 'teal',
  SUBMIT_JUSTIFICATION: 'info',
  APPROVE_JUSTIFICATION: 'teal',
  REJECT_JUSTIFICATION: 'alert',
  CHANGE_PASSWORD: 'neutral',
  CANCEL_SESSION: 'alert',
  RESTORE_SESSION: 'teal',
  RESCHEDULE_SESSION: 'warning',
  ADD_SESSION: 'info',
  SET_CLASS_CODE: 'neutral',
}

const PAGE_SIZE = 20

/** RF-10: historial de acciones del módulo activo, filtrable por estudiante o fecha. */
export function ActivityPage() {
  return (
    <>
      <PageHeader title="Historial de actividades" description="Acciones de estudiantes y administradores en el módulo activo" />
      <ActivityView />
    </>
  )
}

/** Lista de actividades del módulo activo o, con `moduleId`, de un módulo del historial. */
export function ActivityView({ moduleId }: { moduleId?: number }) {
  const [studentId, setStudentId] = useState<number | undefined>()
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const students = useStudents('', true, moduleId)
  const { data, isLoading } = useActivity({ moduleId, studentId, date: date || undefined, page, pageSize: PAGE_SIZE })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const hasFilters = studentId !== undefined || date !== ''

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <label htmlFor="activity-student" className="sr-only">Filtrar por estudiante</label>
            <Select
              id="activity-student"
              value={studentId ?? ''}
              onChange={(e) => {
                setStudentId(e.target.value ? Number(e.target.value) : undefined)
                setPage(1)
              }}
            >
              <option value="">Todos los estudiantes</option>
              {students.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.registrationNumber})
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-48">
            <label htmlFor="activity-date" className="sr-only">Filtrar por fecha</label>
            <Input
              id="activity-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="size-4" />}
              onClick={() => {
                setStudentId(undefined)
                setDate('')
                setPage(1)
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <PageLoader />
        ) : !data?.items.length ? (
          <EmptyState icon={<History className="size-6" />} title="Sin actividades" description="No hay acciones registradas con estos filtros." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold text-muted uppercase">
                    <th className="px-5 py-3">Fecha y hora</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Acción</th>
                    <th className="px-5 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-canvas">
                      <td className="px-5 py-3 whitespace-nowrap text-muted tabular-nums">{formatDateTime(log.createdAt)}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold whitespace-nowrap">{log.actorName}</p>
                        <p className="text-xs text-muted">{log.actorType === 'ADMIN' ? 'Administrador' : 'Estudiante'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Chip tone={ACTION_TONES[log.action] ?? 'neutral'}>{actionLabel(log.action)}</Chip>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {log.description}
                        {typeof log.details?.reason === 'string' && (
                          <p className="mt-0.5 text-xs italic">Motivo: {log.details.reason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
              <span>
                {data.total} {data.total === 1 ? 'registro' : 'registros'}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
