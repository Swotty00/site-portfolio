/** Thin typed fetch wrapper with timeouts, JSON error normalisation and ApiError. */

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  /** True when the request never reached the server (offline, DNS, CORS, timeout...). */
  get isNetwork(): boolean {
    return this.status === 0
  }
  get isNotFound(): boolean {
    return this.status === 404
  }
  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/v1'
const DEFAULT_TIMEOUT_MS = 12_000

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  formData?: FormData
  token?: string | null
  signal?: AbortSignal
  query?: Record<string, string | number | undefined>
  timeoutMs?: number
  /** Send/receive cookies (needed for the httpOnly refresh token). */
  credentials?: RequestCredentials
}

interface FastApiError {
  detail?: unknown
  errors?: { field: string; message: string }[]
}

function describeError(status: number, payload: FastApiError | null, fallback: string): string {
  if (payload?.errors?.length) {
    return payload.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join('\n')
  }
  if (typeof payload?.detail === 'string') return payload.detail
  return fallback || `Request failed (${status})`
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, formData, token, signal, query, timeoutMs = DEFAULT_TIMEOUT_MS, credentials } = options
  const headers: Record<string, string> = { Accept: 'application/json, application/pdf;q=0.9' }
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: BodyInit | undefined
  if (formData) payload = formData
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeoutMs)
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort)

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      signal: controller.signal,
      credentials: credentials ?? 'same-origin',
    })
    if (!response.ok) {
      let parsed: FastApiError | null = null
      try {
        parsed = (await response.json()) as FastApiError
      } catch {
        /* non-JSON error body (e.g. proxy error page) */
      }
      throw new ApiError(describeError(response.status, parsed, response.statusText), response.status, parsed)
    }
    return response
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted) throw error // caller cancelled: let React Query / the caller handle it
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    throw new ApiError(timedOut ? 'The request timed out' : 'Network error', 0, error)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawRequest(path, options)
  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The server returned an unreadable response', response.status)
  }
}
