import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useI18n } from '@/features/i18n/I18nProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useProfile } from '@/hooks/useContent'
import { AboutOverlay } from './AboutOverlay'
import { Footer } from './Footer'
import { Header } from './Header'
import { LanguageSwitcher } from './LanguageSwitcher'

/** Shell for every public page: header, language switcher, about overlay, footer. */
export function Layout() {
  const { t } = useI18n()
  const { data: profile } = useProfile()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [origin, setOrigin] = useState({ x: 48, y: 40 })
  const triggerRef = useRef<HTMLElement | null>(null)

  useDocumentTitle(profile ? `${profile.name} — ${t('meta.tagline')}` : undefined, t('meta.description'))

  const openAbout = useCallback((trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect()
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    triggerRef.current = trigger
    setAboutOpen(true)
  }, [])

  const closeAbout = useCallback(() => {
    setAboutOpen(false)
    // Hand focus back to the control that opened the dialog.
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onHash = () => setAboutOpen(false)
    window.addEventListener('popstate', onHash)
    return () => window.removeEventListener('popstate', onHash)
  }, [])

  return (
    <div className="grain relative">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-full bg-accent px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.16em] text-primary focus:translate-y-0"
      >
        {t('a11y.skip')}
      </a>
      <Header profile={profile} aboutOpen={aboutOpen} onOpenAbout={openAbout} />
      <LanguageSwitcher />
      <AboutOverlay open={aboutOpen} origin={origin} profile={profile} onClose={closeAbout} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer profile={profile} />
    </div>
  )
}
