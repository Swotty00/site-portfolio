/**
 * First-party page-view beacon. No cookies and no stored identifiers: the server derives a
 * daily-rotating anonymous hash from the request. Failures are swallowed — analytics must never
 * affect the site.
 */
import { API_BASE } from './http'

export const IGNORE_KEY = 'portfolio.ignore-analytics'

export function isIgnoringOwnVisits(): boolean {
  try {
    return window.localStorage.getItem(IGNORE_KEY) === '1'
  } catch {
    return false
  }
}

/** Visits from a browser flagged this way (set when you sign in to /admin) are not counted. */
export function setIgnoreOwnVisits(ignore: boolean): void {
  try {
    if (ignore) window.localStorage.setItem(IGNORE_KEY, '1')
    else window.localStorage.removeItem(IGNORE_KEY)
  } catch {
    /* storage unavailable: nothing to do */
  }
}

let lastKey: string | null = null
let firstHit = true

/** Reset module state (tests only). */
export function resetTrackerForTests(): void {
  lastKey = null
  firstHit = true
}

function send(payload: Record<string, string>): void {
  try {
    void fetch(`${API_BASE}/analytics/collect`, {
      method: 'POST',
      keepalive: true, // survives the page being closed / a new tab opening right after
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  } catch {
    /* ignore */
  }
}

/**
 * @param dedupeKey identifies a navigation (e.g. the router's location.key) so that React
 *                  StrictMode's double-invoked effects in development count once.
 */
export function trackPageview(path: string, lang: string, dedupeKey?: string): void {
  if (isIgnoringOwnVisits()) return
  if (dedupeKey !== undefined) {
    if (dedupeKey === lastKey) return
    lastKey = dedupeKey
  }
  // Only the entry page has an external referrer; later hits are in-app navigation.
  const referrer = firstHit ? document.referrer : ''
  firstHit = false
  send({ path, referrer, lang })
}

/** The visitor opened the résumé link on the profile page. */
export function trackResumeClick(lang: string): void {
  if (isIgnoringOwnVisits()) return
  send({ path: '/profile', lang, event: 'resume_click' })
}
