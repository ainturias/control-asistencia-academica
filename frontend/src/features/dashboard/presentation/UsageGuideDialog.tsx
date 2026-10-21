import { AlarmClock, CalendarDays, ClipboardList, FileSpreadsheet, Share2, UserRound, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Modal } from '../../../shared/ui/Modal'

const SECTIONS: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  {
    icon: FileSpreadsheet,
    title: '1. Activar un módulo',
    body: (
      <>
        En <strong>Nuevo módulo</strong> sube dos Excel: <strong>estudiantes</strong> (Número de registro, Nombre completo,
        Correo electrónico) y <strong>fechas</strong> (Fecha dd/mm/aaaa, Hora inicio, Hora fin). Revisa la vista previa y
        confirma. El módulo anterior se conserva en la base de datos.
      </>
    ),
  },
  {
    icon: AlarmClock,
    title: '2. Reglas de asistencia',
    body: (
      <>
        En <strong>Calendario</strong> puedes activar la <strong>puntualidad</strong> (apertura, tolerancia para Presente y
        límite de Atraso) y definir los <strong>puntos</strong> por estado y el <strong>% mínimo</strong> de asistencia.
        Apagada la puntualidad, el estudiante marca todo el día de clase.
      </>
    ),
  },
  {
    icon: ClipboardList,
    title: '3. Asistencias',
    body: (
      <>
        Los estudiantes marcan desde su panel con su correo o número de registro. En <strong>Asistencias</strong> ves la
        matriz completa, filtras por fecha o estudiante, corriges cualquier estado (queda auditado) y exportas a Excel.
      </>
    ),
  },
  {
    icon: UserRound,
    title: '4. Detalle por estudiante',
    body: (
      <>
        Haz clic en el nombre de un estudiante para ver su historial, puntos y si está en riesgo. También lo encuentras con
        la búsqueda (<strong>Ctrl + K</strong>).
      </>
    ),
  },
  {
    icon: CalendarDays,
    title: '5. Perfil y calendario',
    body: (
      <>
        Completa <strong>Mi perfil</strong> (grado, nombre, especialidad, foto): aparece como docente en el calendario que
        ven los estudiantes.
      </>
    ),
  },
  {
    icon: Share2,
    title: '6. Compartir',
    body: (
      <>
        Desde <strong>Calendario</strong> puedes compartir la imagen por WhatsApp, correo o Facebook, descargarla o
        imprimirla.
      </>
    ),
  },
]

export function UsageGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Guía de uso" size="lg">
      <ul className="space-y-4">
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-bold">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
