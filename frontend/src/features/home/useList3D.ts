import gsap from 'gsap'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useSmoothScroll } from '@/features/scroll/SmoothScrollProvider'
import { computeRow, perspectiveOriginY, rowOffset } from './rowTransform'

interface RowState {
  entry: number
  flat: number
  dim: number
  center: number // row centre in stage coordinates (px), measured on resize only
}

interface Options {
  stageRef: RefObject<HTMLElement | null>
  rowRefs: RefObject<(HTMLElement | null)[]>
  count: number
  compact: boolean
  reducedMotion: boolean
}

/**
 * Drives the 3D list.
 *
 * Performance contract (no layout thrashing):
 *  - All geometry (stage offset, viewport height, row centres) is *read* only in `measure()`,
 *    which runs on mount, on resize and once fonts have loaded.
 *  - The per-frame `render()` only *writes* (`transform`, `opacity`, `perspective-origin`),
 *    using the cached geometry and Lenis' scroll value, and bails out when nothing changed.
 */
export function useList3D({ stageRef, rowRefs, count, compact, reducedMotion }: Options) {
  const scroll = useSmoothScroll()
  const rows = useRef<RowState[]>([])
  const geometry = useRef({ stageTop: 0, viewport: 1 })
  const lastScroll = useRef(Number.NaN)
  const dirty = useRef(true)
  const compactRef = useRef(compact)
  compactRef.current = compact

  const markDirty = useCallback(() => {
    dirty.current = true
  }, [])

  // (Re)create per-row state when the number of rows changes.
  useEffect(() => {
    rows.current = Array.from(
      { length: count },
      (_, i) => rows.current[i] ?? { entry: reducedMotion ? 1 : 0, flat: 0, dim: 0, center: 0 },
    )
    rows.current.length = count
    dirty.current = true
  }, [count, reducedMotion])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      const scrollY = window.scrollY
      const stageRect = stage.getBoundingClientRect()
      geometry.current = { stageTop: stageRect.top + scrollY, viewport: window.innerHeight }
      rowRefs.current.forEach((el, i) => {
        const state = rows.current[i]
        if (!el || !state) return
        // offsetTop/offsetHeight ignore transforms, i.e. they are the flat layout box.
        state.center = el.offsetTop + el.offsetHeight / 2
      })
      lastScroll.current = Number.NaN
      dirty.current = true
    }

    const render = () => {
      const y = reducedMotion ? 0 : scroll.getScroll()
      if (!dirty.current && y === lastScroll.current) return
      dirty.current = false
      lastScroll.current = y

      const { stageTop, viewport } = geometry.current
      const originY = perspectiveOriginY(y, viewport, stageTop)
      stage.style.perspectiveOrigin = `50% ${originY.toFixed(1)}px`

      rows.current.forEach((state, i) => {
        const el = rowRefs.current[i]
        if (!el) return
        const p = reducedMotion ? 0 : rowOffset(state.center, originY, viewport)
        const { transform, opacity } = computeRow({
          p,
          entry: state.entry,
          flat: state.flat,
          dim: state.dim,
          index: i,
          compact: compactRef.current,
        })
        el.style.transform = transform
        el.style.opacity = String(opacity)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    gsap.ticker.add(render)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      gsap.ticker.remove(render)
    }
  }, [stageRef, rowRefs, scroll, reducedMotion, count])

  /** Spiral-staircase entrance: every row unwinds from its step into the straight list. */
  const playEntry = useCallback(() => {
    if (reducedMotion) {
      rows.current.forEach((r) => (r.entry = 1))
      markDirty()
      return
    }
    return gsap.to(rows.current, {
      entry: 1,
      duration: 2.1,
      ease: 'expo.out',
      stagger: { each: 0.11, from: 'start' },
      onUpdate: markDirty,
    })
  }, [markDirty, reducedMotion])

  /** Hover/focus: flatten row `index`, dim the others. Pass null to restore everything. */
  const setActive = useCallback(
    (index: number | null) => {
      rows.current.forEach((row, i) => {
        gsap.to(row, {
          flat: index === i ? 1 : 0,
          dim: index !== null && index !== i ? 1 : 0,
          duration: index === i ? 0.7 : 0.55,
          ease: 'expo.out',
          overwrite: 'auto',
          onUpdate: markDirty,
        })
      })
    },
    [markDirty],
  )

  return { playEntry, setActive }
}
