import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { ProfileEditor } from './ProfileEditor'
import { ProjectEditor } from './ProjectEditor'
import { ProjectsAdmin } from './ProjectsAdmin'

function AdminShell() {
  const { status, user, logout } = useAuth()

  // The dashboard must never be indexed.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = 'Admin'
    return () => meta.remove()
  }, [])

  if (status === 'loading') return <div className="grid min-h-svh place-items-center text-ink/60">Loading…</div>
  if (status === 'anonymous') return <LoginPage />

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-accent text-primary' : 'hover:text-accent'}`

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-ink/20 bg-primary/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link to="/admin/projects" className="font-display text-sm font-bold uppercase tracking-[0.18em]">
              Admin
            </Link>
            <nav className="flex gap-1" aria-label="Admin sections">
              <NavLink to="/admin/projects" className={tab}>
                Projects
              </NavLink>
              <NavLink to="/admin/profile" className={tab}>
                Profile
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="link-underline">
              View site ↗
            </Link>
            <span className="text-ink/50">{user?.username}</span>
            <button className="admin-btn" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectsAdmin />} />
          <Route path="projects/new" element={<ProjectEditor />} />
          <Route path="projects/:id" element={<ProjectEditor />} />
          <Route path="profile" element={<ProfileEditor />} />
          <Route path="*" element={<Navigate to="projects" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
