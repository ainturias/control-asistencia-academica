import { AlarmClock, Save } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { Field, Input } from '../../../shared/ui/Field'
import { useToast } from '../../../shared/ui/toast'
import { ClassCodeCard } from '../../class-sessions/presentation/ClassCodeCard'
import { useUpdateAttendanceRules } from '../application/academic-modules.queries'
import type { AttendanceRules } from '../domain/academic-module'
import { fromMinutes, markWindowFor } from '../domain/attendance-rules'

/**
 * Reglas de puntualidad del módulo activo. Apagadas, el sistema funciona como pide RF-12:
 * se marca durante todo el día de clase y la marca siempre es Presente.
 */
export function AttendanceRulesCard({
  rules,
  sampleClass,
}: {
  rules: AttendanceRules
  sampleClass: { startTime: string; endTime: string } | null
}) {
  const update = useUpdateAttendanceRules()
  const toast = useToast()
  const [draft, setDraft] = useState(rules)
  const changed = JSON.stringify(draft) !== JSON.stringify(rules)
  const invalidTimes = draft.toleranceMinutes > draft.lateLimitMinutes
  const invalidPoints = draft.latePoints > draft.presentPoints || draft.presentPoints < 1
  const invalid = invalidTimes || invalidPoints

  const setNumber = (key: Exclude<keyof AttendanceRules, 'enabled' | 'requireClassCode' | 'classHoursOnly'>) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: Math.max(0, Math.floor(Number(value) || 0)) }))

  const save = () =>
    update.mutate(draft, {
      onSuccess: () => toast.success('Reglas de asistencia guardadas'),
      onError: (err) => toast.error(getErrorMessage(err)),
    })

  return (
    <Card>
      <CardHeader
        title="Reglas de asistencia"
        description="Puntualidad, puntos por sesión y asistencia mínima del módulo activo."
      />

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Puntualidad</h3>
            <p className="text-sm text-muted">
              Define cuándo una marca cuenta como Presente, Atraso o Falta según la hora de inicio de cada clase.
            </p>
          </div>
          <Switch
            checked={draft.enabled}
            label={draft.enabled ? 'Activadas' : 'Desactivadas'}
            onChange={(checked) => setDraft((current) => ({ ...current, enabled: checked }))}
          />
        </div>

        {!draft.enabled && (
          <div className="space-y-3 rounded-xl bg-canvas px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-xl">
                <p className="text-sm font-bold">Marcar solo durante el horario de la clase</p>
                <p className="text-sm text-muted">
                  Cada clase usa su propio horario del Excel: se puede marcar desde su hora de inicio hasta su hora de fin.
                </p>
              </div>
              <Switch
                checked={draft.classHoursOnly}
                label={draft.classHoursOnly ? 'Activado' : 'Desactivado'}
                onChange={(checked) => setDraft((current) => ({ ...current, classHoursOnly: checked }))}
              />
            </div>
            <p className="text-sm text-muted">
              {draft.classHoursOnly ? (
                <>
                  El estudiante marca entre la hora de inicio y la de fin de cada clase
                  {sampleClass && (
                    <>
                      {' '}(por ejemplo, de <strong className="text-ink">{sampleClass.startTime}</strong> a{' '}
                      <strong className="text-ink">{sampleClass.endTime}</strong>)
                    </>
                  )}{' '}
                  y queda como <strong className="text-ink">Presente</strong>. Antes no puede marcar todavía; después, queda como{' '}
                  <strong className="text-ink">Falta</strong>.
                </>
              ) : (
                <>
                  El estudiante puede marcar a cualquier hora del día de clase y siempre queda como{' '}
                  <strong className="text-ink">Presente</strong>; si no marca, queda como <strong className="text-ink">Falta</strong>{' '}
                  al terminar el día (así lo pide el documento de requerimientos, RF-12).
                </>
              )}
            </p>
          </div>
        )}

        <div className={cn('grid gap-4 sm:grid-cols-3', !draft.enabled && 'pointer-events-none opacity-50')}>
          <Field label="Se habilita antes del inicio" htmlFor="openBefore" hint="Minutos antes de la hora de inicio.">
            <NumberInput id="openBefore" unit="min" value={draft.openBeforeMinutes} max={180} onChange={setNumber('openBeforeMinutes')} />
          </Field>
          <Field label="Tolerancia para Presente" htmlFor="tolerance" hint="Minutos después del inicio.">
            <NumberInput id="tolerance" unit="min" value={draft.toleranceMinutes} max={240} onChange={setNumber('toleranceMinutes')} />
          </Field>
          <Field label="Límite para Atraso" htmlFor="lateLimit" hint="Minutos después del inicio. Luego es Falta.">
            <NumberInput id="lateLimit" unit="min" value={draft.lateLimitMinutes} max={480} onChange={setNumber('lateLimitMinutes')} />
          </Field>
        </div>

        {invalidTimes && (
          <p role="alert" className="rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">
            La tolerancia para Presente no puede ser mayor que el límite de Atraso.
          </p>
        )}

        {draft.enabled && sampleClass && !invalidTimes && <RulesExample rules={draft} sampleClass={sampleClass} />}

        <div className="border-t border-line pt-5">
          <h3 className="font-bold">Puntuación y asistencia mínima</h3>
          <p className="text-sm text-muted">
            Cada sesión vale los puntos de un Presente. La Falta vale 0 y la sesión justificada no se cuenta.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Puntos por Presente" htmlFor="presentPoints">
              <NumberInput id="presentPoints" unit="pts" value={draft.presentPoints} max={100} onChange={setNumber('presentPoints')} />
            </Field>
            <Field label="Puntos por Atraso" htmlFor="latePoints" hint={draft.enabled ? undefined : 'Se usa con la puntualidad activada.'}>
              <NumberInput id="latePoints" unit="pts" value={draft.latePoints} max={100} onChange={setNumber('latePoints')} />
            </Field>
            <Field label="Asistencia mínima" htmlFor="minAttendance" hint="Por debajo, el estudiante queda en riesgo.">
              <NumberInput
                id="minAttendance"
                unit="%"
                value={draft.minAttendancePercentage}
                max={100}
                onChange={setNumber('minAttendancePercentage')}
              />
            </Field>
          </div>
          {invalidPoints && (
            <p role="alert" className="mt-4 rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">
              Un Presente debe valer al menos 1 punto y un Atraso no puede valer más que un Presente.
            </p>
          )}
        </div>

        <div className="border-t border-line pt-5">
          <h3 className="font-bold">Justificaciones</h3>
          <p className="text-sm text-muted">
            Hasta cuántos días después de la clase el estudiante puede justificar una falta o un atraso con pruebas.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field
              label="Plazo para justificar"
              htmlFor="justificationDays"
              hint={draft.justificationDays === 0 ? 'Desactivado: solo tú registras justificaciones.' : 'Usa 0 para desactivarlas.'}
            >
              <NumberInput
                id="justificationDays"
                unit="días"
                value={draft.justificationDays}
                max={30}
                onChange={setNumber('justificationDays')}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-5">
          <div className="max-w-xl">
            <h3 className="font-bold">Código de clase</h3>
            <p className="text-sm text-muted">
              Para que nadie marque por otro: en cada clase escribes un código (letras y/o números, por ejemplo AB12CD), lo
              compartes en el chat de la clase y el estudiante debe escribirlo para marcar. Se siguen aplicando las reglas de
              Presente, Atraso y Falta según la hora.
            </p>
          </div>
          <Switch
            checked={draft.requireClassCode}
            label={draft.requireClassCode ? 'Activado' : 'Desactivado'}
            onChange={(checked) => setDraft((current) => ({ ...current, requireClassCode: checked }))}
          />
        </div>
        {draft.requireClassCode &&
          (rules.requireClassCode ? (
            <ClassCodeCard embedded />
          ) : (
            <p className="rounded-xl bg-info-soft px-4 py-3 text-sm text-info-ink">
              Pulsa <strong>Guardar reglas</strong> y aquí mismo aparecerá el campo para escribir el código de la clase.
            </p>
          ))}

        <div className="flex justify-end">
          <Button icon={<Save className="size-4" />} onClick={save} loading={update.isPending} disabled={!changed || invalid}>
            Guardar reglas
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm font-semibold">
      {label}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  )
}

function NumberInput({
  id,
  unit,
  value,
  max,
  onChange,
}: {
  id: string
  unit: string
  value: number
  max: number
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <Input id={id} type="number" min={0} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="pr-12" />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>
    </div>
  )
}

/** Línea de tiempo con los tramos de una clase real del módulo. */
function RulesExample({
  rules,
  sampleClass,
}: {
  rules: AttendanceRules
  sampleClass: { startTime: string; endTime: string }
}) {
  const w = markWindowFor(rules, sampleClass.startTime, sampleClass.endTime)
  const span = Math.max(1, w.end - w.opensAt)
  const pct = (minutes: number) => `${(minutes / span) * 100}%`

  const segments = [
    { label: 'Presente', from: w.opensAt, to: w.onTimeUntil, className: 'bg-brand', text: 'text-brand-ink' },
    { label: 'Atraso', from: w.onTimeUntil, to: w.lateUntil, className: 'bg-warning', text: 'text-warning-ink' },
    { label: 'Falta', from: w.lateUntil, to: w.end, className: 'bg-alert', text: 'text-alert-ink' },
  ]

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <AlarmClock className="size-4 text-brand" />
        Ejemplo con una clase de {sampleClass.startTime} a {sampleClass.endTime}
      </p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-canvas">
        {segments.map((s) =>
          s.to > s.from ? <div key={s.label} className={s.className} style={{ width: pct(s.to - s.from) }} /> : null,
        )}
      </div>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <li>
          <span className="font-bold text-brand-ink">Presente</span>
          <span className="block text-muted">
            de {fromMinutes(w.opensAt)} a {fromMinutes(w.onTimeUntil)}
          </span>
        </li>
        <li>
          <span className="font-bold text-warning-ink">Atraso</span>
          <span className="block text-muted">
            {w.lateUntil > w.onTimeUntil
              ? `de ${fromMinutes(w.onTimeUntil + 1)} a ${fromMinutes(w.lateUntil)}`
              : 'no hay tramo de atraso'}
          </span>
        </li>
        <li>
          <span className="font-bold text-alert-ink">Falta</span>
          <span className="block text-muted">si no marcó hasta las {fromMinutes(w.lateUntil)}</span>
        </li>
      </ul>
    </div>
  )
}
