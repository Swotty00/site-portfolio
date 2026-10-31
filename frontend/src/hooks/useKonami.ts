import { useEffect } from 'react'

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/** Calls `onMatch` when the Konami code is typed anywhere on the page. */
export function useKonami(onMatch: () => void) {
  useEffect(() => {
    let index = 0
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      index = key === SEQUENCE[index] ? index + 1 : key === SEQUENCE[0] ? 1 : 0
      if (index === SEQUENCE.length) {
        index = 0
        onMatch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMatch])
}
