import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IGNORE_KEY, isIgnoringOwnVisits, resetTrackerForTests, setIgnoreOwnVisits, trackPageview } from './analytics'

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const body = (fetchMock: ReturnType<typeof stubFetch>, call = 0) =>
  JSON.parse((fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body as string) as Record<
    string,
    string
  >

beforeEach(() => {
  window.localStorage.clear()
  resetTrackerForTests()
})
afterEach(() => vi.unstubAllGlobals())

describe('trackPageview', () => {
  it('posts the path, language and referrer with keepalive', () => {
    const fetchMock = stubFetch()
    Object.defineProperty(document, 'referrer', { value: 'https://news.example/post', configurable: true })
    trackPageview('/projects/aurora', 'en', 'k1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/analytics/collect')
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(body(fetchMock)).toEqual({ path: '/projects/aurora', referrer: 'https://news.example/post', lang: 'en' })
  })

  it('sends the external referrer only for the entry page, not in-app navigation', () => {
    const fetchMock = stubFetch()
    Object.defineProperty(document, 'referrer', { value: 'https://news.example/post', configurable: true })
    trackPageview('/', 'pt-BR', 'k1')
    trackPageview('/profile', 'pt-BR', 'k2')
    expect(body(fetchMock, 0).referrer).toBe('https://news.example/post')
    expect(body(fetchMock, 1).referrer).toBe('')
  })

  it('counts a navigation once even if the effect runs twice (React StrictMode)', () => {
    const fetchMock = stubFetch()
    trackPageview('/', 'en', 'same-key')
    trackPageview('/', 'en', 'same-key')
    trackPageview('/profile', 'en', 'next-key')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does nothing when this browser is flagged as the owner’s', () => {
    const fetchMock = stubFetch()
    setIgnoreOwnVisits(true)
    expect(window.localStorage.getItem(IGNORE_KEY)).toBe('1')
    trackPageview('/', 'en', 'k')
    expect(fetchMock).not.toHaveBeenCalled()

    setIgnoreOwnVisits(false)
    expect(isIgnoringOwnVisits()).toBe(false)
    trackPageview('/', 'en', 'k2')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never throws, even if the network or storage fail', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    )
    expect(() => trackPageview('/', 'en', 'k')).not.toThrow()
    vi.stubGlobal('fetch', () => {
      throw new Error('sync failure')
    })
    expect(() => trackPageview('/', 'en', 'k2')).not.toThrow()
  })
})
