import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CornerDownLeft,
  FileClock,
  History,
  LayoutDashboard,
  Library,
  Search,
  SquarePlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '../../../shared/lib/cn'
import { useDebouncedValue } from '../../../shared/lib/use-debounced-value'
import { Modal } from '../../../shared/ui/Modal'
import { useStudents } from '../../students/application/students.queries'

const PAGES: { to: string; label: string; keywords: string; icon: LucideIcon }[] = [
  { to: '/admin', label: 'Resumen', keywords: 'inicio dashboard', icon: LayoutDashboard },
  { to: '/admin/asistencias', label: 'Asistencias', keywords: 'presentes faltas exportar excel', icon: ClipboardList },
  { to: '/admin/calendario', label: 'Calendario', keywords: 'fechas horario reglas puntualidad compartir', icon: CalendarDays },
  { to: '/admin/reportes', label: 'Reportes', keywords: 'graficos estadisticas ranking riesgo comparacion', icon: BarChart3 },
  { to: '/admin/estudiantes', label: 'Estudiantes', keywords: 'lista alumnos', icon: Users },
  { to: '/admin/justificaciones', label: 'Justificaciones', keywords: 'casos especiales pruebas imagenes faltas', icon: FileClock },
  { to: '/admin/actividades', label: 'Actividades', keywords: 'historial acciones', icon: History },
  { to: '/admin/modulos', label: 'Módulos', keywords: 'historial anteriores programado finalizados', icon: Library },
  { to: '/admin/nuevo-modulo', label: 'Nuevo módulo', keywords: 'importar excel activar programar', icon: SquarePlus },
  { to: '/admin/perfil', label: 'Mi perfil', keywords: 'docente foto datos', icon: UserRound },
]

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Búsqueda rápida (Ctrl+K): páginas del panel y estudiantes del módulo activo. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Buscar" size="lg">
      {open && <PaletteContent onClose={onClose} />}
    </Modal>
  )
}

function PaletteContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const term = useDebouncedValue(query.trim())
  const students = useStudents(term, term.length >= 2)

  const q = normalize(query.trim())
  const pages = PAGES.filter((p) => !q || normalize(`${p.label} ${p.keywords}`).includes(q))
  const studentResults = term.length >= 2 ? (students.data ?? []).slice(0, 6) : []
  const results = [
    ...pages.map((p) => ({ key: p.to, to: p.to, title: p.label, subtitle: 'Página', icon: p.icon })),
    ...studentResults.map((s) => ({
      key: `s-${s.id}`,
      to: `/admin/estudiantes/${s.id}`,
      title: s.fullName,
      subtitle: `Estudiante · Reg. ${s.registrationNumber} · ${s.email}`,
      icon: UserRound,
    })),
  ]
  const active = Math.min(selected, Math.max(0, results.length - 1))

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((active + 1) % Math.max(1, results.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((active - 1 + results.length) % Math.max(1, results.length))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      go(results[active].to)
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Escribe una página o el nombre / registro de un estudiante…"
          className="h-13 w-full rounded-2xl border border-line bg-canvas pr-4 pl-12 text-base focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        />
      </div>

      <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
        {results.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted">
            {students.isFetching ? 'Buscando…' : 'Sin resultados. Prueba con otro nombre o número de registro.'}
          </li>
        ) : (
          results.map((result, index) => (
            <li key={result.key}>
              <button
                type="button"
                onClick={() => go(result.to)}
                onMouseEnter={() => setSelected(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  index === active ? 'bg-brand-soft text-brand-ink' : 'hover:bg-canvas',
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface ring-1 ring-line">
                  <result.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{result.title}</span>
                  <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                </span>
                {index === active && <CornerDownLeft className="size-4 shrink-0 opacity-60" />}
              </button>
            </li>
          ))
        )}
      </ul>
      <p className="mt-3 hidden text-xs text-muted sm:block">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</p>
    </div>
  )
}
