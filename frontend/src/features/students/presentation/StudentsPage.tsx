import { Columns3, Pencil, Search, UserMinus, UserPlus, UserRoundCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { useDebouncedValue } from '../../../shared/lib/use-debounced-value'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { Chip } from '../../../shared/ui/Chip'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Input } from '../../../shared/ui/Field'
import { Modal } from '../../../shared/ui/Modal'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader, Spinner } from '../../../shared/ui/Spinner'
import { useToast } from '../../../shared/ui/toast'
import { useActiveModule, useModule } from '../../academic-modules/application/academic-modules.queries'
import type { ExtraField } from '../../academic-modules/domain/academic-module'
import { useStudentMutations, useStudents } from '../application/students.queries'
import type { Student } from '../domain/student'
import { ExtraFieldsDialog } from './ExtraFieldsDialog'
import { StudentFormDialog } from './StudentFormDialog'

/** RF-06: lista completa del módulo activo con búsqueda; aquí también se corrigen, agregan o dan de baja estudiantes. */
export function StudentsPage() {
  return (
    <>
      <PageHeader
        title="Estudiantes"
        description="Lista de estudiantes del módulo activo. Puedes corregir datos, agregar estudiantes o darlos de baja."
      />
      <StudentsView />
    </>
  )
}

/**
 * Lista con búsqueda. Sin `moduleId` es el módulo activo y se puede editar;
 * con `moduleId` es un módulo del historial (solo lectura, incluye a los dados de baja).
 */
export function StudentsView({ moduleId }: { moduleId?: number }) {
  const editable = moduleId === undefined
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const debounced = useDebouncedValue(search.trim())
  const { data, isLoading, isFetching } = useStudents(debounced, true, moduleId, !editable || showInactive)
  const activeModule = useActiveModule()
  const historyModule = useModule(moduleId ?? 0)
  const fields: ExtraField[] = (editable ? activeModule.data?.extraFields : historyModule.data?.extraFields) ?? []

  const [editing, setEditing] = useState<Student | 'new' | null>(null)
  const [toggling, setToggling] = useState<Student | null>(null)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const canManage = editable && !!activeModule.data

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="student-search" className="sr-only">
              Buscar estudiante
            </label>
            <Input
              id="student-search"
              placeholder="Buscar por nombre o número de registro…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="size-4" />}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isFetching && !isLoading && <Spinner className="size-4 text-brand" />}
            <span className="text-sm font-medium text-muted">
              {data?.length ?? 0} {data?.length === 1 ? 'estudiante' : 'estudiantes'}
            </span>
            {canManage && (
              <>
                <label className="ml-1 flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="size-4 accent-brand"
                  />
                  Ver dados de baja
                </label>
                <Button variant="secondary" size="sm" icon={<Columns3 className="size-4" />} onClick={() => setFieldsOpen(true)}>
                  Campos adicionales
                </Button>
                <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setEditing('new')}>
                  Agregar
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : !data?.length ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title={debounced ? 'Sin resultados' : 'Aún no hay estudiantes'}
            description={debounced ? `Nadie coincide con "${debounced}".` : 'Importa la lista desde "Nuevo módulo".'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold whitespace-nowrap text-muted uppercase">
                  <th className="px-5 py-3">Nº registro</th>
                  <th className="px-5 py-3">Nombre completo</th>
                  <th className="px-5 py-3">Correo electrónico</th>
                  {fields.map((f) => (
                    <th key={f.key} className="px-5 py-3">
                      {f.label}
                    </th>
                  ))}
                  {canManage && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((student) => (
                  <tr key={student.id} className={cn('hover:bg-canvas', !student.active && 'opacity-60')}>
                    <td className="px-5 py-3">
                      <span className="rounded-lg bg-teal-soft px-2 py-1 font-semibold text-teal-ink tabular-nums">
                        {student.registrationNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold whitespace-nowrap">
                      <Link
                        to={moduleId ? `/admin/modulos/${moduleId}/estudiantes/${student.id}` : `/admin/estudiantes/${student.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {student.fullName}
                      </Link>
                      {!student.active && (
                        <Chip tone="outline" className="ml-2">
                          De baja
                        </Chip>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{student.email}</td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-5 py-3 whitespace-nowrap text-muted">
                        {student.extra[f.key] || '—'}
                      </td>
                    ))}
                    {canManage && (
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(student)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={student.active ? <UserMinus className="size-3.5" /> : <UserRoundCheck className="size-3.5" />}
                          onClick={() => setToggling(student)}
                        >
                          {student.active ? 'Dar de baja' : 'Reincorporar'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManage && (
        <>
          <StudentFormDialog target={editing} fields={fields} onClose={() => setEditing(null)} />
          <StatusDialog student={toggling} onClose={() => setToggling(null)} />
          <ExtraFieldsDialog open={fieldsOpen} fields={fields} onClose={() => setFieldsOpen(false)} />
        </>
      )}
    </>
  )
}

/** Confirmación para dar de baja o reincorporar: la baja no borra sus registros. */
function StatusDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const { setActive } = useStudentMutations()
  const toast = useToast()
  const deactivating = student?.active ?? false

  const confirm = () =>
    student &&
    setActive.mutate(
      { id: student.id, active: !student.active },
      {
        onSuccess: () => {
          toast.success(deactivating ? `${student.fullName} fue dado de baja` : `${student.fullName} fue reincorporado`)
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )

  return (
    <Modal
      open={student !== null}
      onClose={onClose}
      title={deactivating ? '¿Dar de baja al estudiante?' : '¿Reincorporar al estudiante?'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={setActive.isPending}>
            Cancelar
          </Button>
          <Button variant={deactivating ? 'danger' : 'primary'} onClick={confirm} loading={setActive.isPending}>
            {deactivating ? 'Sí, dar de baja' : 'Sí, reincorporar'}
          </Button>
        </>
      }
    >
      {student && (
        <p className="text-sm">
          {deactivating ? (
            <>
              <strong>{student.fullName}</strong> ya no podrá ingresar ni aparecerá en las asistencias. Sus registros se
              conservan y puedes reincorporarlo cuando quieras.
            </>
          ) : (
            <>
              <strong>{student.fullName}</strong> podrá volver a ingresar y aparecerá otra vez en las asistencias, con todos
              sus registros anteriores.
            </>
          )}
        </p>
      )}
    </Modal>
  )
}
