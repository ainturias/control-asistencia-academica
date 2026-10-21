import { CalendarDays, FileCheck2, FileClock, FileX2, Inbox, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatDateTime, formatLongDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { Chip } from '../../../shared/ui/Chip'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Modal } from '../../../shared/ui/Modal'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useToast } from '../../../shared/ui/toast'
import { useActiveModule } from '../../academic-modules/application/academic-modules.queries'
import { STATUS_LABELS, type EditableStatus } from '../../attendance/domain/attendance'
import { StatusChip } from '../../attendance/presentation/StatusChip'
import { useJustificationActions, useJustifications } from '../application/justifications.queries'
import { JUSTIFICATION_STATUS_LABELS, type JustificationItem, type JustificationStatus } from '../domain/justification'
import { EvidenceThumbs } from './EvidenceThumbs'

const TABS: { param: string; status: JustificationStatus; label: string; icon: typeof Inbox }[] = [
  { param: 'pendientes', status: 'PENDING', label: 'Pendientes', icon: FileClock },
  { param: 'aprobadas', status: 'APPROVED', label: 'Aprobadas', icon: FileCheck2 },
  { param: 'rechazadas', status: 'REJECTED', label: 'Rechazadas', icon: FileX2 },
]

/** Casos especiales: justificaciones con pruebas enviadas por los estudiantes o adjuntadas por el docente. */
export function JustificationsPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.param === params.get('estado')) ?? TABS[0]
  const { data, isLoading, error } = useJustifications({ status: tab.status })
  const pending = useJustifications({ status: 'PENDING' }).data?.pending ?? 0
  const justificationDays = useActiveModule().data?.rules.justificationDays ?? 0

  return (
    <>
      <PageHeader
        title="Justificaciones"
        description="Casos especiales de asistencia: revisa las pruebas y decide si cambias la asistencia del estudiante."
      />

      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1.5 shadow-sm ring-1 ring-line">
        {TABS.map(({ param, label, icon: Icon, status }) => (
          <button
            key={param}
            type="button"
            role="tab"
            aria-selected={tab.param === param}
            onClick={() => setParams(param === 'pendientes' ? {} : { estado: param }, { replace: true })}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              tab.param === param ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-canvas hover:text-ink',
            )}
          >
            <Icon className="size-4" />
            {label}
            {status === 'PENDING' && pending > 0 && (
              <span className="rounded-full bg-alert px-1.5 text-[11px] font-bold text-white">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card>
          <EmptyState icon={<Inbox className="size-6" />} title="No pudimos cargar las justificaciones" description={getErrorMessage(error)} />
        </Card>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-6" />}
            title={tab.status === 'PENDING' ? 'No hay justificaciones por revisar' : `No hay justificaciones ${tab.label.toLowerCase()}`}
            description={
              justificationDays > 0
                ? `Los estudiantes pueden justificar una falta o un atraso desde su historial, hasta ${justificationDays} ${justificationDays === 1 ? 'día' : 'días'} después de la clase. El plazo se cambia en Calendario > Reglas de asistencia.`
                : 'Las justificaciones de estudiantes están desactivadas en este módulo; puedes adjuntar pruebas al modificar una asistencia.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.items.map((item) => (
            <JustificationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  )
}

function JustificationCard({ item }: { item: JustificationItem }) {
  const [rejecting, setRejecting] = useState(false)
  return (
    <Card className="flex flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/admin/estudiantes/${item.student.id}`} className="flex items-center gap-2 font-bold hover:text-brand">
            <UserRound className="size-4 shrink-0 text-muted" />
            <span className="truncate">{item.student.fullName}</span>
          </Link>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="size-4 shrink-0" />
            {formatLongDate(item.session.date)} · {item.session.startTime} a {item.session.endTime}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Asistencia:</span>
          <StatusChip status={item.currentStatus} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-canvas p-4">
        <p className="text-xs font-semibold text-muted uppercase">
          {item.origin === 'STUDENT' ? 'Motivo del estudiante' : 'Motivo registrado por el docente'}
        </p>
        <p className="mt-1 text-sm whitespace-pre-line">{item.reason}</p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted uppercase">Pruebas ({item.files.length})</p>
        <EvidenceThumbs justificationId={item.id} files={item.files} />
      </div>

      <p className="mt-4 text-xs text-muted">
        {item.origin === 'STUDENT' ? 'Enviada' : 'Adjuntada por el docente'} el {formatDateTime(item.createdAt)}
      </p>

      <div className="mt-4 border-t border-line pt-4">
        {item.status === 'PENDING' ? (
          <ReviewActions item={item} onReject={() => setRejecting(true)} />
        ) : (
          <Resolution item={item} />
        )}
      </div>

      <RejectDialog item={rejecting ? item : null} onClose={() => setRejecting(false)} />
    </Card>
  )
}

function ReviewActions({ item, onReject }: { item: JustificationItem; onReject: () => void }) {
  const rulesEnabled = useActiveModule().data?.rules.enabled ?? false
  const { approve } = useJustificationActions()
  const toast = useToast()
  const [comment, setComment] = useState('')
  const options: EditableStatus[] = rulesEnabled ? ['PRESENTE', 'ATRASO', 'JUSTIFICADO'] : ['PRESENTE', 'JUSTIFICADO']

  const onApprove = (status: EditableStatus) =>
    approve.mutate(
      { id: item.id, status, comment: comment.trim() || undefined },
      {
        onSuccess: () => toast.success(`Aprobada: ${item.student.fullName} queda como ${STATUS_LABELS[status]}`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )

  return (
    <div className="space-y-3">
      <input
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentario para el estudiante (opcional)"
        className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Aprobar como:</span>
        {options.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === 'PRESENTE' ? 'primary' : 'secondary'}
            loading={approve.isPending && approve.variables?.status === status}
            disabled={approve.isPending}
            onClick={() => onApprove(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto text-alert-ink" onClick={onReject} disabled={approve.isPending}>
          Rechazar
        </Button>
      </div>
    </div>
  )
}

function Resolution({ item }: { item: JustificationItem }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={item.status === 'APPROVED' ? 'teal' : 'alert'}>{JUSTIFICATION_STATUS_LABELS[item.status]}</Chip>
        {item.resolvedStatus && <span className="text-muted">como {STATUS_LABELS[item.resolvedStatus]}</span>}
        {item.reviewedAt && <span className="text-xs text-muted">· {formatDateTime(item.reviewedAt)}</span>}
      </div>
      {item.reviewComment && <p className="text-muted">Comentario: “{item.reviewComment}”</p>}
    </div>
  )
}

function RejectDialog({ item, onClose }: { item: JustificationItem | null; onClose: () => void }) {
  const { reject } = useJustificationActions()
  const toast = useToast()
  const [comment, setComment] = useState('')

  const confirm = () =>
    item &&
    reject.mutate(
      { id: item.id, comment },
      {
        onSuccess: () => {
          toast.success('Justificación rechazada')
          setComment('')
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Rechazar justificación"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={reject.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} loading={reject.isPending} disabled={!comment.trim()}>
            Rechazar
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm">
        <p>
          La asistencia de <strong>{item?.student.fullName}</strong> no cambia. Explica el motivo: el estudiante lo verá y podrá
          enviar otra justificación si está dentro del plazo.
        </p>
        <textarea
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ej.: La imagen no se lee, envía una más clara."
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        />
      </div>
    </Modal>
  )
}
