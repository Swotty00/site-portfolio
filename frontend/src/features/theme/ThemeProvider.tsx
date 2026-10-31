import gsap from 'gsap'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'
import { useKonami } from '@/hooks/useKonami'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import { nextThemeIndex, THEME_STORAGE_KEY, THEMES, toChannels, toHex, type RGB, type Theme } from './themes'

interface ThemeContextValue {
  theme: Theme
  cycleTheme: () => void
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredIndex(): number {
  try {
    const id = window.localStorage.getItem(THEME_STORAGE_KEY)
    const index = THEMES.findIndex((t) => t.id === id)
    return index >= 0 ? index : 0
  } catch {
    return 0
  }
}

function paint(channels: { bg: number[]; accent: number[]; ink: number[] }, scheme: Theme['scheme']) {
  const root = document.documentElement.style
  const asRgb = (c: number[]) => toChannels(c as unknown as [number, number, number])
  root.setProperty('--c-bg', asRgb(channels.bg))
  root.setProperty('--c-accent', asRgb(channels.accent))
  root.setProperty('--c-ink', asRgb(channels.ink))
  root.colorScheme = scheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', toHex(channels.bg as unknown as [number, number, number]))
}

/**
 * Owns the site-wide colour theme. Colours are CSS variables, so switching theme re-colours
 * every Tailwind utility at once; GSAP tweens the RGB channels for a smooth cross-fade.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(readStoredIndex)
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const current = useRef({
    bg: [...THEMES[index]!.bg],
    accent: [...THEMES[index]!.accent],
    ink: [...THEMES[index]!.ink],
  })
  const firstRun = useRef(true)
  const theme = THEMES[index]!
  const indexRef = useRef(index)
  indexRef.current = index

  useEffect(() => {
    const target = THEMES[index]!
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, target.id)
    } catch {
      /* storage unavailable */
    }

    const state = current.current
    if (firstRun.current || prefersReducedMotion()) {
      firstRun.current = false
      state.bg = [...target.bg]
      state.accent = [...target.accent]
      state.ink = [...target.ink]
      paint(state, target.scheme)
      return
    }
    // Tween a single 0→1 progress value and interpolate the RGB channels by hand.
    const from = { bg: [...state.bg], accent: [...state.accent], ink: [...state.ink] }
    const mix = (a: number[], b: RGB, k: number) => a.map((v, i) => v + (b[i]! - v) * k)
    const progress = { v: 0 }
    const tween = gsap.to(progress, {
      v: 1,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        state.bg = mix(from.bg, target.bg, progress.v)
        state.accent = mix(from.accent, target.accent, progress.v)
        state.ink = mix(from.ink, target.ink, progress.v)
        paint(state, target.scheme)
      },
    })
    return () => {
      tween.kill()
    }
  }, [index])

  // Toast with the new theme name (announced politely to screen readers).
  const toastTimer = useRef<number | undefined>(undefined)
  const announce = useCallback(
    (next: Theme) => {
      window.clearTimeout(toastTimer.current)
      setToast({ text: t('theme.changed', { name: next.name }), key: Date.now() })
      toastTimer.current = window.setTimeout(() => setToast(null), 2200)
    },
    [t],
  )
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const cycleTheme = useCallback(() => {
    const next = nextThemeIndex(indexRef.current)
    setIndex(next)
    announce(THEMES[next]!)
  }, [announce])

  const setTheme = useCallback(
    (id: string) => {
      const next = THEMES.findIndex((th) => th.id === id)
      if (next >= 0) {
        setIndex(next)
        announce(THEMES[next]!)
      }
    },
    [announce],
  )

  useKonami(cycleTheme)

  const value = useMemo(() => ({ theme, cycleTheme, setTheme }), [theme, cycleTheme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4"
      >
        {toast && (
          <span
            key={toast.key}
            className="animate-[toast-in_.45s_cubic-bezier(.16,1,.3,1)] rounded-full border border-accent/60 bg-primary/90 px-5 py-2.5 font-display text-xs uppercase tracking-[0.18em] text-accent backdrop-blur"
          >
            {toast.text}
          </span>
        )}
      </div>
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
