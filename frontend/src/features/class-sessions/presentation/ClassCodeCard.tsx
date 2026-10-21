import { Check, Copy, KeyRound, Maximize2, RefreshCw, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { formatLongDate, formatShortDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toast'
import { useActiveModule } from '../../academic-modules/application/academic-modules.queries'
import { useClassSessions } from '../../attendance/application/attendance.queries'
import type { ClassSession } from '../../attendance/domain/attendance'
import { todayIso } from '../../calendar/domain/calendar'
import { useSetClassCode } from '../application/sessions.queries'

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000))
const CODE_PATTERN = /^[A-Z0-9]{4,8}$/

/**
 * Código de clase (solo si el módulo lo exige): el docente lo escribe o genera, lo publica y lo
 * comparte (chat de Zoom, WhatsApp…); los estudiantes lo escriben para marcar.
 * `embedded` lo muestra sin tarjeta, dentro de las reglas de asistencia.
 */
export function ClassCodeCard({ embedded = false }: { embedded?: boolean }) {
  const module = useActiveModule()
  const sessions = useClassSessions()
  const today = todayIso()
  // Hoy y las próximas clases vigentes, para poder preparar el código antes.
  const options = (sessions.data ?? []).filter((s) => s.status === 'SCHEDULED' && s.classDate >= today)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  if (!module.data?.rules.requireClassCode) return null

  const session = options.find((s) => s.id === selectedId) ?? options[0]
  const body = !session ? (
    <p className="text-sm text-muted">No hay clases próximas en el módulo.</p>
  ) : (
    <div className="space-y-4">
      {options.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Clase:</span>
          <select
            value={session.id}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="h-9 rounded-xl border border-line bg-surface px-3 text-sm capitalize focus:border-brand focus:outline-none"
          >
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.classDate === today ? 'Hoy · ' : ''}
                {formatShortDate(s.classDate)} · {s.startTime}
                {s.classCode ? ' · con código' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <CodeEditor key={`${session.id}-${session.classCode}`} session={session} moduleName={module.data.name} isToday={session.classDate === today} />
    </div>
  )

  if (embedded) return <div className="rounded-xl border border-line p-4">{body}</div>
  return (
    <Card>
      <CardHeader title="Código de clase" description="Los estudiantes deben escribirlo para marcar su asistencia." />
      <div className="p-5">{body}</div>
    </Card>
  )
}

function CodeEditor({ session, moduleName, isToday }: { session: ClassSession; moduleName: string; isToday: boolean }) {
  const setCode = useSetClassCode()
  const toast = useToast()
  const [value, setValue] = useState(session.classCode ?? '')
  const [projecting, setProjecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const clean = value.replace(/\s+/g, '').toUpperCase()
  const valid = CODE_PATTERN.test(clean)
  const when = `${isToday ? 'hoy, ' : ''}${formatLongDate(session.classDate)} de ${session.startTime} a ${session.endTime}`
  const message = `Código de asistencia de la clase de ${when}: ${session.classCode}`

  const save = (code: string | null) =>
    setCode.mutate(
      { id: session.id, code },
      {
        onSuccess: (updated) =>
          toast.success(updated.classCode ? `Código publicado: ${updated.classCode}` : 'Código quitado'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(session.classCode ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar; selecciona el código y cópialo a mano')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <KeyRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted first-letter:uppercase">{when}</p>
          <p className="text-2xl font-extrabold tracking-[0.25em] tabular-nums select-all">
            {session.classCode ?? <span className="text-base font-semibold tracking-normal text-alert-ink">Sin código publicado</span>}
          </p>
        </div>
      </div>

      {session.classCode && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void copy()}>
            {copied ? 'Copiado' : 'Copiar código'}
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
          >
            <Share2 className="size-4" /> Compartir por WhatsApp
          </a>
          <Button variant="secondary" icon={<Maximize2 className="size-4" />} onClick={() => setProjecting(true)}>
            Mostrar en pantalla
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Ej.: AB12CD"
            aria-label="Código de la clase"
            className="h-10 w-44 rounded-xl border border-line bg-surface px-3 text-center font-bold tracking-[0.2em] uppercase focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
          {value && !valid && <p className="mt-1 text-xs text-alert-ink">De 4 a 8 letras o números, sin símbolos.</p>}
        </div>
        <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => setValue(randomCode())}>
          Generar
        </Button>
        <Button onClick={() => save(clean)} loading={setCode.isPending} disabled={!valid || clean === session.classCode}>
          {session.classCode ? 'Cambiar código' : 'Publicar código'}
        </Button>
        {session.classCode && (
          <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => save(null)} disabled={setCode.isPending}>
            Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        Escribe el código que quieras (letras y/o números, de 4 a 8) o genera uno. Compártelo en el chat de la clase; tras 5
        intentos fallidos, el estudiante necesita que tú registres su asistencia.
      </p>

      <Modal open={projecting} onClose={() => setProjecting(false)} title={moduleName} size="lg">
        <div className="py-6 text-center">
          <p className="text-lg text-muted">Código de la clase</p>
          <p className="mt-4 text-6xl font-extrabold tracking-[0.3em] text-brand tabular-nums sm:text-8xl">{session.classCode}</p>
          <p className="mt-6 text-muted">Escríbelo en tu panel para marcar tu asistencia.</p>
        </div>
      </Modal>
    </div>
  )
}
