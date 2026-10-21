import { AlertTriangle, CalendarDays, Check, Columns3, Eye, EyeOff, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Field'
import type {
  ImportDraft,
  ImportErrors,
  ImportIssue,
  SessionDraft,
  StudentDraft,
} from '../domain/academic-module'

/** Selección de una columna extra del Excel: si se guarda, con qué nombre y quién la ve. */
export interface ExtraSelection {
  key: string
  header: string
  label: string
  enabled: boolean
  visibleToStudent: boolean
}

type Tab = 'students' | 'sessions' | 'fields'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Agrupa los errores por fila de la tabla (1, 2, 3…); los de archivo van en la clave 0. */
const byRow = (issues: ImportIssue[]) => {
  const map = new Map<number, ImportIssue[]>()
  for (const issue of issues) {
    const row = issue.row ?? 0
    map.set(row, [...(map.get(row) ?? []), issue])
  }
  return map
}

/**
 * Vista previa editable: corregir, quitar o agregar estudiantes y fechas sin volver a subir el Excel,
 * y elegir qué columnas extra guardar. Cada cambio se vuelve a validar en el servidor.
 */
export function ImportDraftEditor({
  draft,
  errors,
  extras,
  onDraftChange,
  onExtrasChange,
}: {
  draft: ImportDraft
  errors: ImportErrors
  extras: ExtraSelection[]
  onDraftChange: (draft: ImportDraft) => void
  onExtrasChange: (extras: ExtraSelection[]) => void
}) {
  const [tab, setTab] = useState<Tab>('students')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const studentErrors = byRow(errors.students)
  const sessionErrors = byRow(errors.sessions)
  const shownExtras = extras.filter((e) => e.enabled)

  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-line/60 p-1">
        <TabButton active={tab === 'students'} onClick={() => setTab('students')} errors={errors.students.length}>
          <Users className="size-4" /> {draft.students.length} estudiantes
        </TabButton>
        <TabButton active={tab === 'sessions'} onClick={() => setTab('sessions')} errors={errors.sessions.length}>
          <CalendarDays className="size-4" /> {draft.sessions.length} fechas
        </TabButton>
        {extras.length > 0 && (
          <TabButton active={tab === 'fields'} onClick={() => setTab('fields')}>
            <Columns3 className="size-4" /> {extras.length} columnas extra
          </TabButton>
        )}
      </div>

      {tab !== 'fields' && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={onlyErrors}
              onChange={(e) => setOnlyErrors(e.target.checked)}
              className="size-4 accent-brand"
            />
            Mostrar solo filas con errores
          </label>
          <p className="text-xs text-muted">Usa ✏️ para corregir una fila; los cambios se validan al instante.</p>
        </div>
      )}

      {tab === 'students' && (
        <StudentsTable
          rows={draft.students}
          extras={shownExtras}
          errors={studentErrors}
          onlyErrors={onlyErrors}
          onChange={(students) => onDraftChange({ ...draft, students })}
        />
      )}
      {tab === 'sessions' && (
        <SessionsTable
          rows={draft.sessions}
          errors={sessionErrors}
          onlyErrors={onlyErrors}
          onChange={(sessions) => onDraftChange({ ...draft, sessions })}
        />
      )}
      {tab === 'fields' && <ExtrasPanel extras={extras} draft={draft} onChange={onExtrasChange} />}
    </div>
  )
}

/* ───────────────────────── Estudiantes ───────────────────────── */

const EMPTY_STUDENT: StudentDraft = { registrationNumber: '', fullName: '', email: '', extra: {} }

function StudentsTable({
  rows,
  extras,
  errors,
  onlyErrors,
  onChange,
}: {
  rows: StudentDraft[]
  extras: ExtraSelection[]
  errors: Map<number, ImportIssue[]>
  onlyErrors: boolean
  onChange: (rows: StudentDraft[]) => void
}) {
  const [editing, setEditing] = useState<{ index: number; value: StudentDraft } | null>(null)

  const save = () => {
    if (!editing) return
    onChange(rows.map((row, i) => (i === editing.index ? editing.value : row)))
    setEditing(null)
  }
  const add = () => {
    onChange([...rows, EMPTY_STUDENT])
    setEditing({ index: rows.length, value: EMPTY_STUDENT })
  }
  const remove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index))
    setEditing(null)
  }

  return (
    <>
      <EditableTable
        headers={['#', 'Registro', 'Nombre', 'Correo', ...extras.map((e) => e.label), '']}
        fileErrors={errors.get(0)}
      >
        {rows.map((row, index) => {
          const rowErrors = errors.get(index + 1)
          if (onlyErrors && !rowErrors) return null
          const isEditing = editing?.index === index
          const value = isEditing ? editing.value : row
          const set = (patch: Partial<StudentDraft>) => setEditing({ index, value: { ...value, ...patch } })
          return (
            <RowGroup key={index} errors={rowErrors} span={5 + extras.length}>
              <td className="px-3 py-2 text-xs text-muted tabular-nums">{index + 1}</td>
              {isEditing ? (
                <>
                  <Cell>
                    <Input
                      autoFocus
                      aria-label="Número de registro"
                      value={value.registrationNumber}
                      onChange={(e) => set({ registrationNumber: e.target.value })}
                      className="h-9 min-w-24"
                    />
                  </Cell>
                  <Cell>
                    <Input aria-label="Nombre completo" value={value.fullName} onChange={(e) => set({ fullName: e.target.value })} className="h-9 min-w-44" />
                  </Cell>
                  <Cell>
                    <Input aria-label="Correo" value={value.email} onChange={(e) => set({ email: e.target.value })} className="h-9 min-w-48" />
                  </Cell>
                  {extras.map((extra) => (
                    <Cell key={extra.key}>
                      <Input
                        aria-label={extra.label}
                        value={value.extra[extra.key] ?? ''}
                        onChange={(e) => set({ extra: { ...value.extra, [extra.key]: e.target.value } })}
                        className="h-9 min-w-32"
                      />
                    </Cell>
                  ))}
                </>
              ) : (
                <>
                  <Cell className="tabular-nums">{row.registrationNumber || <Missing />}</Cell>
                  <Cell className="font-medium">{row.fullName || <Missing />}</Cell>
                  <Cell className="text-muted">{row.email || <Missing />}</Cell>
                  {extras.map((extra) => (
                    <Cell key={extra.key} className="text-muted">
                      {row.extra[extra.key] || '—'}
                    </Cell>
                  ))}
                </>
              )}
              <RowActions
                editing={isEditing}
                onEdit={() => setEditing({ index, value: row })}
                onSave={save}
                onCancel={() => (row === EMPTY_STUDENT ? remove(index) : setEditing(null))}
                onRemove={() => remove(index)}
              />
            </RowGroup>
          )
        })}
      </EditableTable>
      <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} className="mt-3" onClick={add}>
        Agregar estudiante
      </Button>
    </>
  )
}

/* ───────────────────────── Fechas ───────────────────────── */

const EMPTY_SESSION: SessionDraft = { date: '', startTime: '', endTime: '' }

function SessionsTable({
  rows,
  errors,
  onlyErrors,
  onChange,
}: {
  rows: SessionDraft[]
  errors: Map<number, ImportIssue[]>
  onlyErrors: boolean
  onChange: (rows: SessionDraft[]) => void
}) {
  const [editing, setEditing] = useState<{ index: number; value: SessionDraft } | null>(null)

  const save = () => {
    if (!editing) return
    onChange(rows.map((row, i) => (i === editing.index ? editing.value : row)))
    setEditing(null)
  }
  const add = () => {
    // La nueva fecha copia el horario de la última, que suele repetirse.
    const last = rows[rows.length - 1]
    const value = { ...EMPTY_SESSION, startTime: last?.startTime ?? '', endTime: last?.endTime ?? '' }
    onChange([...rows, value])
    setEditing({ index: rows.length, value })
  }
  const remove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index))
    setEditing(null)
  }

  return (
    <>
      <EditableTable headers={['#', 'Fecha', 'Día', 'Hora inicio', 'Hora fin', '']} fileErrors={errors.get(0)}>
        {rows.map((row, index) => {
          const rowErrors = errors.get(index + 1)
          if (onlyErrors && !rowErrors) return null
          const isEditing = editing?.index === index
          const value = isEditing ? editing.value : row
          const set = (patch: Partial<SessionDraft>) => setEditing({ index, value: { ...value, ...patch } })
          const validDate = ISO_DATE.test(value.date)
          return (
            <RowGroup key={index} errors={rowErrors} span={6}>
              <td className="px-3 py-2 text-xs text-muted tabular-nums">{index + 1}</td>
              {isEditing ? (
                <>
                  <Cell>
                    <Input
                      autoFocus
                      type="date"
                      aria-label="Fecha"
                      value={validDate ? value.date : ''}
                      onChange={(e) => set({ date: e.target.value })}
                      className="h-9"
                    />
                  </Cell>
                  <Cell className="text-muted capitalize">{validDate ? formatShortDate(value.date) : '—'}</Cell>
                  <Cell>
                    <Input type="time" aria-label="Hora inicio" value={value.startTime} onChange={(e) => set({ startTime: e.target.value })} className="h-9" />
                  </Cell>
                  <Cell>
                    <Input type="time" aria-label="Hora fin" value={value.endTime} onChange={(e) => set({ endTime: e.target.value })} className="h-9" />
                  </Cell>
                </>
              ) : (
                <>
                  <Cell className="font-medium tabular-nums">
                    {validDate ? value.date.split('-').reverse().join('/') : value.date || <Missing />}
                  </Cell>
                  <Cell className="text-muted capitalize">{validDate ? formatShortDate(value.date) : '—'}</Cell>
                  <Cell className="tabular-nums">{row.startTime || <Missing />}</Cell>
                  <Cell className="tabular-nums">{row.endTime || <Missing />}</Cell>
                </>
              )}
              <RowActions
                editing={isEditing}
                onEdit={() => setEditing({ index, value: row })}
                onSave={save}
                onCancel={() => (row.date === '' ? remove(index) : setEditing(null))}
                onRemove={() => remove(index)}
              />
            </RowGroup>
          )
        })}
      </EditableTable>
      <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} className="mt-3" onClick={add}>
        Agregar fecha
      </Button>
    </>
  )
}

/* ───────────────────────── Columnas extra ───────────────────────── */

function ExtrasPanel({
  extras,
  draft,
  onChange,
}: {
  extras: ExtraSelection[]
  draft: ImportDraft
  onChange: (extras: ExtraSelection[]) => void
}) {
  const update = (key: string, patch: Partial<ExtraSelection>) =>
    onChange(extras.map((e) => (e.key === key ? { ...e, ...patch } : e)))

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-info-soft px-4 py-3 text-sm text-info-ink">
        Tu Excel trae columnas además de las obligatorias. Elige cuáles guardar como <strong>campos adicionales</strong>, con
        qué nombre mostrarlas y si el estudiante puede verlas en su perfil. Las que no marques se ignoran.
      </p>
      {extras.map((extra) => {
        const samples = draft.students.map((s) => s.extra[extra.key]).filter(Boolean).slice(0, 3)
        return (
          <div
            key={extra.key}
            className={cn('rounded-xl border p-4 transition', extra.enabled ? 'border-brand/40 bg-brand-soft/30' : 'border-line')}
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={extra.enabled}
                  onChange={(e) => update(extra.key, { enabled: e.target.checked })}
                  className="size-4 accent-brand"
                />
                Guardar “{extra.header}”
              </label>
              <span className="text-xs text-muted">Ej.: {samples.length ? samples.join(' · ') : 'sin valores'}</span>
            </div>
            {extra.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <Input
                  aria-label={`Nombre para ${extra.header}`}
                  maxLength={60}
                  value={extra.label}
                  onChange={(e) => update(extra.key, { label: e.target.value })}
                  placeholder="Nombre que se muestra"
                />
                <button
                  type="button"
                  onClick={() => update(extra.key, { visibleToStudent: !extra.visibleToStudent })}
                  className={cn(
                    'flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 transition',
                    extra.visibleToStudent ? 'bg-teal-soft text-teal-ink ring-teal/30' : 'bg-canvas text-muted ring-line',
                  )}
                >
                  {extra.visibleToStudent ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  {extra.visibleToStudent ? 'Visible para el estudiante' : 'Solo administrador'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Piezas compartidas ───────────────────────── */

function EditableTable({
  headers,
  fileErrors,
  children,
}: {
  headers: string[]
  fileErrors?: ImportIssue[]
  children: ReactNode
}) {
  return (
    <>
      {fileErrors?.map((issue, i) => (
        <p key={i} className="mb-3 flex gap-2 rounded-xl bg-alert-soft px-4 py-3 text-sm text-alert-ink">
          <AlertTriangle className="size-4 shrink-0" /> {issue.message}
        </p>
      ))}
      <div className="max-h-[30rem] overflow-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-canvas">
            <tr className="text-left text-xs font-semibold whitespace-nowrap text-muted uppercase">
              {headers.map((header, i) => (
                <th key={i} className="px-3 py-2.5">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </>
  )
}

/** Fila con sus errores debajo; en rojo mientras tenga alguno. */
function RowGroup({ errors, span, children }: { errors?: ImportIssue[]; span: number; children: ReactNode }) {
  return (
    <>
      <tr className={cn('border-t border-line', errors && 'bg-alert-soft/50')}>{children}</tr>
      {errors && (
        <tr className="bg-alert-soft/50">
          <td colSpan={span} className="px-3 pb-2.5 text-xs text-alert-ink">
            {errors.map((issue, i) => (
              <span key={i} className="mr-3 inline-flex items-center gap-1">
                <AlertTriangle className="size-3.5" />
                {issue.field && <strong>{issue.field}:</strong>} {issue.message}
              </span>
            ))}
          </td>
        </tr>
      )}
    </>
  )
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn('px-3 py-2 align-middle', className)}>{children}</td>
}

function Missing() {
  return <span className="text-alert-ink italic">vacío</span>
}

function RowActions({
  editing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
}: {
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  const base = 'grid size-8 place-items-center rounded-lg transition'
  return (
    <td className="px-3 py-2 text-right whitespace-nowrap">
      <div className="inline-flex gap-1">
        {editing ? (
          <>
            <button type="button" onClick={onSave} className={cn(base, 'bg-brand text-white hover:bg-brand-ink')} title="Guardar fila">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={onCancel} className={cn(base, 'text-muted hover:bg-canvas')} title="Cancelar">
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className={cn(base, 'text-muted hover:bg-canvas hover:text-brand')} title="Corregir fila">
              <Pencil className="size-4" />
            </button>
            <button type="button" onClick={onRemove} className={cn(base, 'text-muted hover:bg-alert-soft hover:text-alert-ink')} title="Quitar fila">
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
    </td>
  )
}

function TabButton({
  active,
  onClick,
  errors = 0,
  children,
}: {
  active: boolean
  onClick: () => void
  errors?: number
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-9 flex-1 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition',
        active ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink',
      )}
    >
      {children}
      {errors > 0 && (
        <span className="rounded-full bg-alert px-1.5 text-[11px] font-bold text-white">{errors}</span>
      )}
    </button>
  )
}
