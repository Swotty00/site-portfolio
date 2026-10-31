import gsap from 'gsap'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSmoothScroll } from '@/features/scroll/SmoothScrollProvider'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'

interface NavigateOptions {
  /** Big word shown on the curtain while the next page loads (e.g. the project title). */
  label?: string
  replace?: boolean
}

interface TransitionApi {
  navigateTo: (to: string, options?: NavigateOptions) => void
  isBusy: () => boolean
  /** Run `callback` once the curtain starts lifting (immediately when no transition is running). */
  whenRevealed: (callback: () => void) => () => void
}

const TransitionContext = createContext<TransitionApi | null>(null)

/**
 * PJAX-style navigation for the SPA: a curtain wipes over the old page, the router swaps
 * routes underneath it (no full reload), then the curtain lifts to reveal the new page whose
 * own entrance animation is released by `usePageEnter`.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const scroll = useSmoothScroll()
  const curtainRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const onCommitted = useRef<(() => void) | null>(null)
  const revealListeners = useRef(new Set<() => void>())
  const pathRef = useRef(location.pathname + location.search)
  pathRef.current = location.pathname + location.search

  // A route committed: finish the pending transition, or (back/forward) just reset scroll.
  useEffect(() => {
    if (onCommitted.current) {
      const resume = onCommitted.current
      onCommitted.current = null
      resume()
    } else if (!busy.current) {
      scroll.scrollTo(0, { immediate: true })
    }
  }, [location.key, scroll])

  const navigateTo = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (busy.current || to === pathRef.current) return
      const curtain = curtainRef.current
      const label = labelRef.current
      if (!curtain || !label || prefersReducedMotion()) {
        navigate(to, { replace: options?.replace })
        return
      }

      busy.current = true
      label.textContent = options?.label ?? ''
      scroll.stop()
      curtain.style.display = 'flex'

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(curtain, { display: 'none' })
          busy.current = false
          scroll.start()
        },
      })
      tl.fromTo(
        curtain,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.75, ease: 'expo.inOut' },
      )
        .fromTo(
          label,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' },
          '-=0.3',
        )
        .add(() => {
          // Hand control to the router, and wait until the new route has actually rendered.
          tl.pause()
          const resume = () => tl.resume()
          onCommitted.current = resume
          window.setTimeout(() => {
            if (onCommitted.current === resume) {
              onCommitted.current = null
              resume()
            }
          }, 4000) // never leave the user stuck behind the curtain
          navigate(to, { replace: options?.replace })
        })
        .add(() => scroll.scrollTo(0, { immediate: true }))
        .to(label, { yPercent: -110, opacity: 0, duration: 0.4, ease: 'power3.in' }, '+=0.12')
        .add(() => {
          revealListeners.current.forEach((cb) => cb())
          revealListeners.current.clear()
        })
        .to(curtain, { clipPath: 'inset(0 0 100% 0)', duration: 0.85, ease: 'expo.inOut' }, '<0.05')
    },
    [navigate, scroll],
  )

  const api = useMemo<TransitionApi>(
    () => ({
      navigateTo,
      isBusy: () => busy.current,
      whenRevealed: (callback) => {
        if (!busy.current) {
          callback()
          return () => undefined
        }
        revealListeners.current.add(callback)
        return () => revealListeners.current.delete(callback)
      },
    }),
    [navigateTo],
  )

  return (
    <TransitionContext.Provider value={api}>
      {children}
      <div
        ref={curtainRef}
        aria-hidden="true"
        style={{ display: 'none', clipPath: 'inset(100% 0 0 0)' }}
        className="pointer-events-auto fixed inset-0 z-[60] items-center justify-center overflow-hidden bg-accent px-6 text-primary"
      >
        <span className="block overflow-hidden">
          <span
            ref={labelRef}
            className="block text-center font-display text-[clamp(2.5rem,10vw,9rem)] font-bold uppercase leading-none tracking-tightest"
          />
        </span>
      </div>
    </TransitionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTransition(): TransitionApi {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransition must be used inside <TransitionProvider>')
  return ctx
}

/** Anchor that navigates through the curtain transition but stays a real, crawlable link. */
export function TransitionLink({
  to,
  label,
  onClick,
  children,
  ...rest
}: ComponentPropsWithRef<typeof Link> & { to: string; label?: string }) {
  const { navigateTo } = useTransition()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      rest.target === '_blank'
    )
      return
    event.preventDefault()
    navigateTo(to, { label })
  }
  return (
    <Link to={to} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
