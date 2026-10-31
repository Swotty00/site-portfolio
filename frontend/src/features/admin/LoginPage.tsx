import { useState, type FormEvent } from 'react'
import { ApiError } from '@/services/http'
import { useAuth } from './AuthProvider'
import { Banner, TextField } from './ui'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError('Too many attempts. Wait a minute and try again.')
      else if (err instanceof ApiError && err.isNetwork) setError('Could not reach the server.')
      else if (err instanceof ApiError && err.status === 401) setError('Incorrect username or password.')
      else setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center px-5">
      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-sm space-y-5">
        <div>
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tightest">Sign in</h1>
        </div>
        {error && <Banner kind="error">{error}</Banner>}
        <TextField
          label="Username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={64}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={72}
        />
        <button type="submit" className="admin-btn admin-btn-primary w-full" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
