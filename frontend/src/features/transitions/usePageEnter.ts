import { useEffect, useRef } from 'react'
import { useTransition } from './TransitionProvider'

/**
 * Run a page's entrance animation once its data is `ready` *and* any page transition's
 * curtain has started to lift. `run` may return a cleanup (e.g. `ctx.revert`).
 */
export function usePageEnter(ready: boolean, run: () => void | (() => void)) {
  const { whenRevealed } = useTransition()
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    if (!ready) return
    let cleanup: void | (() => void)
    const unsubscribe = whenRevealed(() => {
      cleanup = runRef.current()
    })
    return () => {
      unsubscribe()
      if (typeof cleanup === 'function') cleanup()
    }
  }, [ready, whenRevealed])
}
