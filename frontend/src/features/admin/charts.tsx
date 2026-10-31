import { useEffect, useRef, useState } from 'react'
import type { Bucket } from '@/types/api'
import { formatCount, formatDay, formatDelta, linePath, nearestIndex, niceScale, pickTickIndices } from './chartMath'

// ---------------------------------------------------------------------------- stat tile

export function StatTile({
  label,
  value,
  current,
  previous,
  periodLabel,
}: {
  label: string
  value: string
  current?: number
  previous?: number
  periodLabel?: string
}) {
  const delta = current !== undefined && previous !== undefined ? formatDelta(current, previous) : null
  return (
    <div className="rounded-xl border border-ink/20 bg-ink/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/70">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 h-5 text-xs text-ink/60">
        {delta && (
          <span
            aria-label={`${delta.direction === 'down' ? 'down' : delta.direction === 'up' ? 'up' : 'unchanged'} ${delta.text} ${periodLabel ?? ''}`}
          >
            <span aria-hidden="true">{delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '■'} </span>
            {delta.text} {periodLabel}
          </span>
        )}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------- line/area chart

const HEIGHT = 190
const MARGIN = { left: 44, right: 16, top: 12, bottom: 26 }

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

interface LineChartProps {
  title: string
  points: { date: string; value: number }[]
  /** Shared between charts so hovering one moves the crosshair in both. */
  activeIndex: number | null
  onActiveChange: (index: number | null) => void
}

/** One series, drawn as a 2px line over a ~10% wash. A single series needs no legend: the title names it. */
export function LineChart({ title, points, activeIndex, onActiveChange }: LineChartProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const width = useWidth(boxRef)
  const total = points.reduce((sum, p) => sum + p.value, 0)

  const plotW = width - MARGIN.left - MARGIN.right
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
  const scale = niceScale(Math.max(0, ...points.map((p) => p.value)))
  const xAt = (i: number) => MARGIN.left + (points.length <= 1 ? plotW / 2 : (i * plotW) / (points.length - 1))
  const yAt = (v: number) => MARGIN.top + plotH * (1 - v / scale.max)
  const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }))
  const baseline = MARGIN.top + plotH
  const last = coords[coords.length - 1]
  const active = activeIndex !== null ? points[activeIndex] : undefined
  const activeCoord = activeIndex !== null ? coords[activeIndex] : undefined

  // Pointer + keyboard are wired natively (the table view below is the accessible equivalent).
  const stateRef = useRef({ count: points.length, activeIndex, left: MARGIN.left, plotW })
  stateRef.current = { count: points.length, activeIndex, left: MARGIN.left, plotW }
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const { left, plotW: w, count } = stateRef.current
      onActiveChange(nearestIndex(event.clientX - rect.left, left, w, count))
    }
    const leave = () => onActiveChange(null)
    const key = (event: KeyboardEvent) => {
      const { count, activeIndex: current } = stateRef.current
      const next =
        event.key === 'ArrowRight'
          ? Math.min(count - 1, (current ?? -1) + 1)
          : event.key === 'ArrowLeft'
            ? Math.max(0, (current ?? count) - 1)
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? count - 1
                : null
      if (next === null) return
      event.preventDefault()
      onActiveChange(next)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('keydown', key)
    el.addEventListener('blur', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('keydown', key)
      el.removeEventListener('blur', leave)
    }
  }, [onActiveChange])

  const tipLeft = activeCoord ? Math.min(Math.max(activeCoord.x, 70), width - 70) : 0

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-xs tabular-nums text-ink/60">{formatCount(total)} in this period</span>
      </figcaption>
      <div
        ref={boxRef}
        // A focusable chart so keyboard users can step through the days (←/→/Home/End).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="group"
        aria-label={`${title}: ${formatCount(total)} over ${points.length} days. Use the arrow keys to read each day.`}
        className="relative touch-pan-y rounded-md outline-offset-4"
        style={{ height: HEIGHT }}
      >
        <svg width={width} height={HEIGHT} className="block" aria-hidden="true">
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="stroke-ink/15"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={yAt(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink/60 text-[11px] tabular-nums"
              >
                {formatCount(tick)}
              </text>
            </g>
          ))}
          {pickTickIndices(points.length, width < 520 ? 3 : 5).map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-ink/60 text-[11px]"
            >
              {formatDay(points[i]!.date)}
            </text>
          ))}

          <path d={linePath(coords, baseline)} className="fill-accent/10" />
          <path
            d={linePath(coords)}
            className="fill-none stroke-accent"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activeCoord ? (
            <>
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={MARGIN.top}
                y2={baseline}
                className="stroke-ink/40"
                strokeWidth={1}
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r={4}
                className="fill-accent stroke-primary"
                strokeWidth={2}
              />
            </>
          ) : (
            last && <circle cx={last.x} cy={last.y} r={4} className="fill-accent stroke-primary" strokeWidth={2} />
          )}
        </svg>

        {active && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-ink/25 bg-primary px-3 py-2 text-xs shadow-xl"
            style={{ left: tipLeft }}
          >
            <p className="text-ink/60">{formatDay(active.date, true)}</p>
            <p className="mt-0.5 flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded bg-accent" />
              <strong className="text-sm font-semibold tabular-nums">{active.value.toLocaleString('en-US')}</strong>
              <span className="text-ink/60">{title.toLowerCase()}</span>
            </p>
          </div>
        )}
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------------------- ranked bars

/** Horizontal ranked bars for one categorical breakdown. One series -> one colour, no ramp. */
export function BarList({
  title,
  items,
  labelFor,
  emptyText = 'No data yet',
}: {
  title: string
  items: Bucket[]
  labelFor: (name: string) => string
  emptyText?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.views))
  return (
    <section className="rounded-xl border border-ink/20 bg-ink/[0.04] p-5">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.16em] text-accent">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink/50">{emptyText}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li
              key={item.name || '∅'}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
            >
              <span className="truncate text-sm" title={labelFor(item.name)}>
                {labelFor(item.name)}
              </span>
              <span className="text-sm tabular-nums">
                <strong className="font-semibold">{formatCount(item.views)}</strong>
                <span className="ml-2 text-xs text-ink/55">
                  {formatCount(item.visitors)} {item.visitors === 1 ? 'visitor' : 'visitors'}
                </span>
              </span>
              <span
                className="col-span-2 block h-2 rounded-r-[4px] bg-accent/90 transition-opacity group-hover:bg-accent"
                style={{ width: `${Math.max(2, (item.views / max) * 100)}%` }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
