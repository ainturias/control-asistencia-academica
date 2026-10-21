import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../../shared/lib/cn'

/** Ancho real del contenedor, para dibujar el SVG sin deformar textos. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  // Se voltea hacia la izquierda cerca del borde derecho para no salirse del gráfico.
  const flip = x > width - 180
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-36 rounded-xl bg-surface px-3 py-2 text-xs shadow-xl ring-1 ring-line"
      style={{ left: flip ? undefined : x + 12, right: flip ? width - x + 12 : undefined, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  )
}

export interface Series {
  key: string
  label: string
  /** Variable CSS del color (cambia sola con el tema). */
  color: string
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

const PAD = { top: 16, right: 48, bottom: 28, left: 40 }

/** Una sola serie en porcentaje (0–100) a lo largo de las clases, con línea de referencia. */
export function PercentLineChart({
  points,
  threshold,
  height = 240,
}: {
  points: { label: string; detail: string; value: number }[]
  threshold?: { value: number; label: string }
  height?: number
}) {
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i * innerW) / (points.length - 1))
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const area = points.length ? `${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : ''
  const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerW / 64))))
  const last = points[points.length - 1]

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Porcentaje de asistencia por clase">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
                {t}%
              </text>
            </g>
          ))}
          {threshold && (
            <g>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(threshold.value)} y2={y(threshold.value)} stroke="var(--color-muted)" strokeWidth={1} />
              <text x={PAD.left + innerW + 4} y={y(threshold.value) + 4} className="fill-muted text-[11px]">
                {threshold.label}
              </text>
            </g>
          )}
          {points.map((p, i) =>
            i % every === 0 || i === points.length - 1 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px] capitalize">
                {p.label}
              </text>
            ) : null,
          )}
          <path d={area} fill="var(--color-chart-present)" opacity={0.1} />
          <path d={path} fill="none" stroke="var(--color-chart-present)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-muted)" strokeWidth={1} />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i || i === points.length - 1 ? 5 : 0}
              fill="var(--color-chart-present)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}
          {last && (
            <text x={x(points.length - 1) + 8} y={y(last.value) - 8} className="fill-ink text-xs font-semibold">
              {last.value}%
            </text>
          )}
          {/* Zonas de captura más anchas que la marca */}
          {points.map((_, i) => (
            <rect
              key={i}
              x={x(i) - innerW / Math.max(1, points.length) / 2}
              y={PAD.top}
              width={Math.max(12, innerW / Math.max(1, points.length))}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      {hover !== null && points[hover] && (
        <Tooltip x={x(hover)} y={y(points[hover].value)} width={width}>
          <p className="font-semibold capitalize">{points[hover].label}</p>
          <p className="text-muted">{points[hover].detail}</p>
        </Tooltip>
      )}
    </div>
  )
}

/** Columnas apiladas por clase (cantidad de estudiantes en cada estado). */
export function StackedColumns({
  items,
  series,
  height = 240,
}: {
  items: { label: string; values: Record<string, number> }[]
  series: Series[]
  height?: number
}) {
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { ...PAD, right: 12 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(1, ...items.map((it) => series.reduce((sum, s) => sum + (it.values[s.key] ?? 0), 0)))
  const step = items.length ? innerW / items.length : 0
  const barW = Math.min(24, Math.max(4, step * 0.6))
  const y = (v: number) => (v / max) * innerH
  const ticks = [0, Math.round(max / 2), max]
  const every = Math.max(1, Math.ceil(items.length / Math.max(1, Math.floor(innerW / 64))))

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Estados de asistencia por clase">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + innerW} y1={pad.top + innerH - y(t)} y2={pad.top + innerH - y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.left - 8} y={pad.top + innerH - y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
                {t}
              </text>
            </g>
          ))}
          {items.map((item, i) => {
            const cx = pad.left + step * i + step / 2
            const visible = series.filter((s) => (item.values[s.key] ?? 0) > 0)
            let cursor = pad.top + innerH
            const segments = visible.map((s, j) => {
              const h = y(item.values[s.key])
              // 2px de separación en el color de la superficie entre segmentos.
              const bottom = cursor - (j > 0 ? 2 : 0)
              const top = cursor - h
              cursor = top
              if (bottom - top <= 0) return null
              const r = j === visible.length - 1 ? Math.min(4, (bottom - top) / 2) : 0
              const left = cx - barW / 2
              const right = cx + barW / 2
              return (
                <path
                  key={s.key}
                  d={`M${left},${bottom} V${top + r} Q${left},${top} ${left + r},${top} H${right - r} Q${right},${top} ${right},${top + r} V${bottom} Z`}
                  fill={s.color}
                />
              )
            })
            return (
              <g key={i} opacity={hover === null || hover === i ? 1 : 0.55}>
                {segments}
                {(i % every === 0 || i === items.length - 1) && (
                  <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px] capitalize">
                    {item.label}
                  </text>
                )}
                <rect x={cx - step / 2} y={pad.top} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && items[hover] && (
        <Tooltip x={pad.left + step * hover + step / 2} y={pad.top} width={width}>
          <p className="mb-1 font-semibold capitalize">{items[hover].label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">{items[hover].values[s.key] ?? 0}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

/** Barras horizontales en porcentaje (una sola serie), con marca del mínimo. */
export function PercentBars({
  items,
  threshold,
}: {
  items: { key: string | number; label: string; sub?: string; value: number; href?: string }[]
  threshold?: number
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_3rem]">
          <div className="min-w-0 text-sm">
            {item.href ? (
              <Link to={item.href} className="block truncate font-semibold hover:text-brand hover:underline">
                {item.label}
              </Link>
            ) : (
              <p className="truncate font-semibold">{item.label}</p>
            )}
            {item.sub && <p className="truncate text-xs text-muted">{item.sub}</p>}
          </div>
          <div className="relative h-4" title={`${item.value}%`}>
            <div className="absolute inset-0 rounded-full bg-canvas" />
            <div
              className={cn('absolute inset-y-0 left-0 rounded-r-[4px]')}
              style={{ width: `${Math.max(item.value, 1)}%`, background: 'var(--color-chart-present)' }}
            />
            {threshold !== undefined && (
              <div className="absolute -inset-y-1 w-px bg-muted" style={{ left: `${threshold}%` }} title={`Mínimo ${threshold}%`} />
            )}
          </div>
          <span className="text-right text-sm font-semibold tabular-nums">{item.value}%</span>
        </li>
      ))}
    </ul>
  )
}
