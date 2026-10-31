/** Pure helpers for the analytics charts (kept free of React so they can be unit-tested). */

/** Round-number axis: always starts at 0, integer steps for counts. */
export function niceScale(max: number, intervals = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) {
    return { max: intervals, ticks: Array.from({ length: intervals + 1 }, (_, i) => i) }
  }
  const rough = max / intervals
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  // Smallest "nice" step that fits in `intervals` divisions; whole numbers only (these are counts).
  const candidates = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).filter(Number.isInteger)
  const step = Math.max(1, candidates.find((c) => c >= rough) ?? 10 * magnitude)
  const top = step * Math.ceil(max / step)
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(v)
  return { max: top, ticks }
}

/** Full numbers under 10,000 ("1,284"), compact above ("12.9K"). */
export function formatCount(n: number): string {
  if (Math.abs(n) < 10_000) return n.toLocaleString('en-US')
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export interface Delta {
  text: string // "+12%"
  direction: 'up' | 'down' | 'flat'
}

/** Change versus the previous period, or null when there is nothing to compare against. */
export function formatDelta(current: number, previous: number): Delta | null {
  if (previous <= 0) return current > 0 ? { text: 'new', direction: 'up' } : null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: '0%', direction: 'flat' }
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, direction: pct > 0 ? 'up' : 'down' }
}

/** Evenly spread indices (always including first and last) for x-axis labels. */
export function pickTickIndices(length: number, wanted: number): number[] {
  if (length <= 0) return []
  if (length <= wanted) return Array.from({ length }, (_, i) => i)
  const out = new Set<number>()
  for (let i = 0; i < wanted; i++) out.add(Math.round((i * (length - 1)) / (wanted - 1)))
  return [...out].sort((a, b) => a - b)
}

const dayFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fullDayFormat = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `YYYY-MM-DD` -> "Oct 31" (the date is a calendar day, so it must not shift with the viewer's zone). */
export function formatDay(isoDate: string, full = false): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return (full ? fullDayFormat : dayFormat).format(date)
}

/** SVG path through the points; `closeTo` adds a baseline so it can be filled as an area. */
export function linePath(points: { x: number; y: number }[], closeTo?: number): string {
  if (points.length === 0) return ''
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  if (closeTo === undefined) return line
  const first = points[0]!
  const last = points[points.length - 1]!
  return `${line} L${last.x.toFixed(1)},${closeTo.toFixed(1)} L${first.x.toFixed(1)},${closeTo.toFixed(1)} Z`
}

/** Nearest data index for a pointer x position inside the plot area. */
export function nearestIndex(x: number, left: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0
  const ratio = Math.min(1, Math.max(0, (x - left) / width))
  return Math.round(ratio * (count - 1))
}
