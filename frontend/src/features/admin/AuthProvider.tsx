import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setIgnoreOwnVisits } from '@/services/analytics'
import * as authService from '@/services/auth'
import type { User } from '@/types/api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)

  // Restore the session from the httpOnly refresh cookie (if any) when the admin area opens.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const token = await authService.refreshSession()
        const me = token ? await authService.fetchCurrentUser() : null
        if (cancelled) return
        setUser(me)
        setStatus(me ? 'authenticated' : 'anonymous')
        if (me) setIgnoreOwnVisits(true) // the owner's own browsing shouldn't skew the stats
      } catch {
        if (!cancelled) setStatus('anonymous')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await authService.login(username, password)
    setUser(await authService.fetchCurrentUser())
    setStatus('authenticated')
    setIgnoreOwnVisits(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
