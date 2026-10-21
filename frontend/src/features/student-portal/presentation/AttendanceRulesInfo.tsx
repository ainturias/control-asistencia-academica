import { AlarmClock, CheckCircle2, FileCheck2, Target, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardHeader } from '../../../shared/ui/Card'
import type { AttendanceRules } from '../../academic-modules/domain/academic-module'
import { fromMinutes, markWindowFor } from '../../academic-modules/domain/attendance-rules'

const pts = (n: number) => `${n} ${n === 1 ? 'punto' : 'puntos'}`

/** Explica al estudiante cómo se califica su asistencia en este módulo. */
export function AttendanceRulesInfo({
  rules,
  sampleClass,
}: {
  rules: AttendanceRules
  sampleClass: { startTime: string; endTime: string } | null
}) {
  const w = sampleClass ? markWindowFor(rules, sampleClass.startTime, sampleClass.endTime) : null
  const example = (from: number, to: number) => (w ? ` (de ${fromMinutes(from)} a ${fromMinutes(to)})` : '')

  return (
    <Card>
      <CardHeader
        title="¿Cómo se registra mi asistencia?"
        description={sampleClass ? `Ejemplo con una clase de ${sampleClass.startTime} a ${sampleClass.endTime}` : undefined}
      />
      <ul className="space-y-3 p-5 text-sm">
        {rules.enabled && w ? (
          <>
            <Rule icon={<CheckCircle2 className="size-4" />} tone="bg-brand-soft text-brand-ink" title={`Presente · ${pts(rules.presentPoints)}`}>
              Desde {rules.openBeforeMinutes} min antes del inicio hasta {rules.toleranceMinutes} min después
              {example(w.opensAt, w.onTimeUntil)}.
            </Rule>
            <Rule icon={<AlarmClock className="size-4" />} tone="bg-warning-soft text-warning-ink" title={`Atraso · ${pts(rules.latePoints)}`}>
              Hasta {rules.lateLimitMinutes} min después del inicio{example(w.onTimeUntil + 1, w.lateUntil)}.
            </Rule>
            <Rule icon={<XCircle className="size-4" />} tone="bg-alert-soft text-alert-ink" title="Falta · 0 puntos">
              Si no marcas hasta las {fromMinutes(w.lateUntil)}, ya no podrás marcar.
            </Rule>
          </>
        ) : (
          <>
            <Rule icon={<CheckCircle2 className="size-4" />} tone="bg-brand-soft text-brand-ink" title={`Presente · ${pts(rules.presentPoints)}`}>
              {rules.classHoursOnly
                ? `Marca durante el horario de la clase, desde su hora de inicio hasta su hora de fin${sampleClass ? ` (de ${sampleClass.startTime} a ${sampleClass.endTime})` : ''}.`
                : 'Marca a cualquier hora del día de clase.'}
            </Rule>
            <Rule icon={<XCircle className="size-4" />} tone="bg-alert-soft text-alert-ink" title="Falta · 0 puntos">
              {rules.classHoursOnly
                ? 'Si no marcas antes de que termine la clase; después ya no podrás marcar.'
                : 'Si no marcas hasta el final del día de clase.'}
            </Rule>
          </>
        )}
        <Rule icon={<FileCheck2 className="size-4" />} tone="bg-info-soft text-info-ink" title="Justificaciones">
          {rules.justificationDays > 0
            ? `Si faltaste o llegaste tarde por un motivo válido, puedes justificarlo con imágenes desde tu historial hasta ${rules.justificationDays} ${rules.justificationDays === 1 ? 'día' : 'días'} después de la clase. El docente decide si cambia tu asistencia.`
            : 'Solo el docente puede corregir una asistencia o justificar una falta.'}
        </Rule>
        <Rule icon={<Target className="size-4" />} tone="bg-accent-soft text-accent-ink" title={`Asistencia mínima: ${rules.minAttendancePercentage}%`}>
          Por debajo de ese porcentaje quedas en riesgo.
        </Rule>
      </ul>
    </Card>
  )
}

function Rule({ icon, tone, title, children }: { icon: ReactNode; tone: string; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted">{children}</p>
      </div>
    </li>
  )
}
