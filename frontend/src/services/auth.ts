/**
 * Session handling for the admin area.
 *
 * The short-lived access token only lives in memory (never localStorage, so XSS can't
 * exfiltrate a long-lived credential). The long-lived refresh token is an httpOnly cookie
 * managed by the server; `refreshSession()` uses it to mint a new access token on reload.
 */
import type { TokenResponse, User } from '@/types/api'
import { ApiError, request, type RequestOptions } from './http'

let accessToken: string | null = null
let inflightRefresh: Promise<string | null> | null = null

export const getAccessToken = () => accessToken

export async function login(username: string, password: string): Promise<void> {
  const res = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
    credentials: 'include',
  })
  accessToken = res.access_token
}

/** Exchange the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<string | null> {
  inflightRefresh ??= request<TokenResponse>('/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => {
      accessToken = res.access_token
      return accessToken
    })
    .catch((error: unknown) => {
      accessToken = null
      if (error instanceof ApiError && !error.isNetwork) return null // not signed in
      throw error
    })
    .finally(() => {
      inflightRefresh = null
    })
  return inflightRefresh
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST', credentials: 'include' })
  } finally {
    accessToken = null
  }
}

export const fetchCurrentUser = () => authedRequest<User>('/auth/me')

/** Authenticated request that transparently refreshes the access token once on a 401. */
export async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!accessToken) await refreshSession()
  try {
    return await request<T>(path, { ...options, token: accessToken })
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isUnauthorized) throw error
    const fresh = await refreshSession()
    if (!fresh) throw error
    return request<T>(path, { ...options, token: fresh })
  }
}
