import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './http'

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('returns parsed JSON and builds the query string', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const data = await request<{ ok: boolean }>('/projects', { query: { lang: 'en', skip: undefined } })
    expect(data).toEqual({ ok: true })
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/v1/projects?lang=en')
  })

  it('sends the bearer token and JSON body', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    await request('/admin/projects/1', { method: 'DELETE', token: 'abc' })
    await request('/x', { method: 'POST', body: { a: 1 }, token: 'abc' })
    const init = vi.mocked(fetch).mock.calls[1]![1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
  })

  it('resolves undefined for 204 responses', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    await expect(request('/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('maps FastAPI string details to ApiError', async () => {
    mockFetch(async () => new Response(JSON.stringify({ detail: 'Project not found' }), { status: 404 }))
    const error = await request('/projects/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Project not found')
    expect((error as ApiError).isNotFound).toBe(true)
  })

  it('flattens validation errors into a readable message', async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({ detail: 'Validation failed', errors: [{ field: 'slug', message: 'bad slug' }] }),
          { status: 422 },
        ),
    )
    const error = (await request('/x', { method: 'POST', body: {} }).catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(422)
    expect(error.message).toBe('slug: bad slug')
  })

  it('survives non-JSON error bodies (proxy error pages)', async () => {
    mockFetch(async () => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }))
    const error = (await request('/x').catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(502)
    expect(error.message).toBe('Bad Gateway')
  })

  it('reports network failures with status 0', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = (await request('/x').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.isNetwork).toBe(true)
  })

  it('reports timeouts', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))
        }),
    )
    const error = (await request('/x', { timeoutMs: 10 }).catch((e: unknown) => e)) as ApiError
    expect(error.isNetwork).toBe(true)
    expect(error.message).toMatch(/timed out/i)
  })
})
