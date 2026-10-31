import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { adminApi } from '@/services/admin'
import { isIgnoringOwnVisits, setIgnoreOwnVisits } from '@/services/analytics'
import { LOCALE_META, isLocale } from '@/types/i18n'
import { formatCount, formatDay } from './chartMath'
import { BarList, LineChart, StatTile } from './charts'
import { errorMessage } from './errors'
import { Banner, Card } from './ui'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

const labels = {
  page: (name: string) => (name === '/' ? 'Home' : name),
  referrer: (name: string) => name || 'Direct / none',
  country: (name: string) => {
    if (!name) return 'Unknown'
    try {
      return regionNames?.of(name) ?? name
    } catch {
      return name
    }
  },
  device: (name: string) => (name ? name[0]!.toUpperCase() + name.slice(1) : 'Unknown'),
  browser: (name: string) => name || 'Unknown',
  locale: (name: string) => (isLocale(name) ? `${LOCALE_META[name].native} (${name})` : 'Unknown'),
}

export function AnalyticsPage() {
  const [days, setDays] = useState<number>(30)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [ignoreOwn, setIgnoreOwn] = useState(isIgnoringOwnVisits)
  const onActive = useCallback((i: number | null) => setActiveIndex(i), [])

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => adminApi.analytics(days),
    placeholderData: keepPreviousData, // keep the frame while a new range loads
    refetchInterval: 60_000,
  })

  const range = RANGES.find((r) => r.days === days)
  const periodLabel = `vs previous ${range?.label ?? `${days} days`}`
  const empty = data && data.totals.pageviews === 0 && data.totals.resume_downloads === 0

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tightest">Analytics</h1>

      {/* One filter row above everything it scopes. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Date range" className="flex gap-1 rounded-full border border-ink/25 p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={r.days === days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                r.days === days ? 'bg-accent text-primary' : 'hover:text-accent'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/70">
          <input
            type="checkbox"
            checked={ignoreOwn}
            onChange={(e) => {
              setIgnoreOwn(e.target.checked)
              setIgnoreOwnVisits(e.target.checked)
            }}
            className="size-4 accent-[rgb(var(--c-accent))]"
          />
          Don’t count my visits from this browser
        </label>
      </div>

      {error && !data && (
        <Banner kind="error">
          {errorMessage(error)}{' '}
          <button className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </Banner>
      )}
      {isPending && <p className="text-ink/60">Loading…</p>}

      {data && (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`} aria-busy={isFetching}>
          {empty && (
            <Banner kind="success">
              No visits recorded in this period yet. Visits are counted on the public pages; bots, “Do Not Track”
              visitors and (by default) your own browser are left out.
            </Banner>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Pageviews"
              value={formatCount(data.totals.pageviews)}
              current={data.totals.pageviews}
              previous={data.previous.pageviews}
              periodLabel={periodLabel}
            />
            <StatTile
              label="Visitors"
              value={formatCount(data.totals.visitors)}
              current={data.totals.visitors}
              previous={data.previous.visitors}
              periodLabel={periodLabel}
            />
            <StatTile
              label="Pages per visitor"
              value={data.totals.visitors ? (data.totals.pageviews / data.totals.visitors).toFixed(1) : '—'}
            />
            <StatTile label="Résumé clicks" value={formatCount(data.totals.resume_downloads)} />
          </div>

          <Card>
            <div className="space-y-8">
              <LineChart
                title="Pageviews"
                points={data.series.map((d) => ({ date: d.date, value: d.pageviews }))}
                activeIndex={activeIndex}
                onActiveChange={onActive}
              />
              <LineChart
                title="Visitors"
                points={data.series.map((d) => ({ date: d.date, value: d.visitors }))}
                activeIndex={activeIndex}
                onActiveChange={onActive}
              />
            </div>
            <p className="mt-5 text-xs text-ink/55">
              Days follow the {data.timezone} timezone ({formatDay(data.start)} – {formatDay(data.end)}). A visitor is
              counted once per day: no cookies are used and identifiers rotate daily, so the same person on two days is
              two visitors.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ink/80 hover:text-accent">View as table</summary>
              <div className="mt-3 max-h-72 overflow-auto rounded-md border border-ink/15">
                <table className="w-full text-sm tabular-nums">
                  <thead className="sticky top-0 bg-primary text-left text-xs uppercase tracking-[0.12em] text-ink/60">
                    <tr>
                      <th className="px-3 py-2 font-medium">Day</th>
                      <th className="px-3 py-2 text-right font-medium">Pageviews</th>
                      <th className="px-3 py-2 text-right font-medium">Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.series].reverse().map((d) => (
                      <tr key={d.date} className="border-t border-ink/10">
                        <td className="px-3 py-1.5">{formatDay(d.date, true)}</td>
                        <td className="px-3 py-1.5 text-right">{d.pageviews}</td>
                        <td className="px-3 py-1.5 text-right">{d.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Top pages" items={data.top_pages} labelFor={labels.page} />
            <BarList
              title="Top projects"
              items={data.top_projects}
              labelFor={(n) => n.replace('/projects/', '')}
              emptyText="No project pages viewed yet"
            />
            <BarList title="Referrers" items={data.referrers} labelFor={labels.referrer} />
            <BarList
              title="Countries"
              items={data.countries.filter((c) => c.name)}
              labelFor={labels.country}
              emptyText="Needs a CDN header such as CF-IPCountry (see README)"
            />
            <BarList title="Devices" items={data.devices} labelFor={labels.device} />
            <BarList title="Browsers" items={data.browsers} labelFor={labels.browser} />
            <BarList title="Site language" items={data.locales} labelFor={labels.locale} />
          </div>
        </div>
      )}
    </div>
  )
}
