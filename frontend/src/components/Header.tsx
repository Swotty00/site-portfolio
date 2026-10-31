import { useLocation } from 'react-router-dom'
import { useI18n } from '@/features/i18n/I18nProvider'
import { useSmoothScroll } from '@/features/scroll/SmoothScrollProvider'
import { useTheme } from '@/features/theme/ThemeProvider'
import { TransitionLink, useTransition } from '@/features/transitions/TransitionProvider'
import type { ProfilePublic } from '@/types/api'

interface Props {
  profile: ProfilePublic | undefined
  aboutOpen: boolean
  onOpenAbout: (trigger: HTMLElement) => void
}

const navItem =
  'group relative flex items-baseline gap-2 whitespace-nowrap font-display text-xs font-medium uppercase tracking-[0.1em] text-ink transition-colors hover:text-accent md:text-sm md:tracking-[0.16em]'

function Num({ children }: { children: string }) {
  return <span className="text-[0.65rem] tabular-nums text-accent">{children}</span>
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function Header({ profile, aboutOpen, onOpenAbout }: Props) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { cycleTheme } = useTheme()
  const { navigateTo } = useTransition()
  const scroll = useSmoothScroll()
  const name = profile?.name ?? ''

  const goToWork = () => {
    if (pathname === '/') scroll.scrollTo('#work', { offset: -24 })
    else navigateTo('/', { label: t('nav.work') })
  }

  const items = (
    <>
      <li>
        <button
          type="button"
          className={navItem}
          aria-haspopup="dialog"
          aria-expanded={aboutOpen}
          aria-controls="about-overlay"
          onClick={(e) => onOpenAbout(e.currentTarget)}
        >
          <Num>01</Num>
          <span className="link-underline">{t('nav.about')}</span>
        </button>
      </li>
      <li>
        <button type="button" className={navItem} onClick={goToWork}>
          <Num>02</Num>
          <span className="link-underline">{t('nav.work')}</span>
        </button>
      </li>
      <li>
        <TransitionLink
          to="/profile"
          label={t('nav.profile')}
          className={navItem}
          aria-current={pathname === '/profile' ? 'page' : undefined}
        >
          <Num>03</Num>
          <span className="link-underline">{t('nav.profile')}</span>
        </TransitionLink>
      </li>
    </>
  )

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary via-primary/80 to-transparent"
        />
        <div className="relative flex items-center justify-between gap-6 px-5 py-4 pr-28 md:px-8 md:py-6 md:pr-32">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <TransitionLink
              to="/"
              aria-label={t('a11y.home')}
              className="font-display text-base font-bold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
            >
              <span className="md:hidden">{initials(name) || '·'}</span>
              <span className="hidden md:inline">{name || '·'}</span>
            </TransitionLink>
            {/* Easter egg: shifts the colour theme of the whole site (also: ↑↑↓↓←→←→BA). */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={t('a11y.theme')}
              title={t('a11y.theme')}
              className="grid size-6 place-items-center rounded-full"
            >
              <span className="block size-2.5 animate-[dot-pulse_2.8s_ease-in-out_infinite] rounded-full bg-accent" />
            </button>
          </div>

          <nav aria-label={t('a11y.mainNav')} className="pointer-events-auto hidden md:block">
            <ul className="flex items-center gap-9">{items}</ul>
          </nav>
        </div>
      </header>

      {/* Mobile: the same navigation as a floating bottom bar. */}
      <nav
        aria-label={t('a11y.mainNav')}
        className="fixed inset-x-4 bottom-4 z-40 rounded-full border border-ink/25 bg-primary/75 px-5 py-3 backdrop-blur-xl md:hidden"
      >
        <ul className="flex items-center justify-between gap-3">{items}</ul>
      </nav>
    </>
  )
}
