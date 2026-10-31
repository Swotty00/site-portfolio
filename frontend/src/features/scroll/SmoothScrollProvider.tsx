import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

export interface ScrollApi {
  /** Current (smoothed) scroll position in px. Cheap: no layout read. */
  getScroll: () => number
  scrollTo: (target: number | string | HTMLElement, options?: { immediate?: boolean; offset?: number }) => void
  stop: () => void
  start: () => void
}

const ScrollContext = createContext<ScrollApi | null>(null)

/**
 * Inertia scrolling with Lenis (the engine Locomotive Scroll v5 is built on), driven by
 * GSAP's ticker so scroll, ScrollTrigger and tweens all advance on the same frame.
 * Disabled entirely when the user prefers reduced motion (native scrolling is used).
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, autoRaf: false })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  const api = useMemo<ScrollApi>(
    () => ({
      getScroll: () => lenisRef.current?.scroll ?? window.scrollY,
      scrollTo: (target, options) => {
        const lenis = lenisRef.current
        // `force`: Lenis ignores scrollTo while stopped (e.g. behind the transition curtain).
        if (lenis) lenis.scrollTo(target, { immediate: options?.immediate, offset: options?.offset, force: true })
        else if (typeof target === 'number')
          window.scrollTo({ top: target, behavior: options?.immediate ? 'instant' : 'smooth' })
        else {
          const el = typeof target === 'string' ? document.querySelector(target) : target
          el?.scrollIntoView({ behavior: options?.immediate ? 'instant' : 'smooth' })
        }
      },
      stop: () => {
        lenisRef.current?.stop()
        if (!lenisRef.current) document.documentElement.style.overflow = 'hidden'
      },
      start: () => {
        lenisRef.current?.start()
        document.documentElement.style.overflow = ''
      },
    }),
    [],
  )

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSmoothScroll(): ScrollApi {
  const ctx = useContext(ScrollContext)
  if (!ctx) throw new Error('useSmoothScroll must be used inside <SmoothScrollProvider>')
  return ctx
}
