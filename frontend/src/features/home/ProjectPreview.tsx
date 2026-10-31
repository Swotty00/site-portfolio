import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import type { ProjectPublic } from '@/types/api'

/** Cover image that trails the cursor while a row is hovered (pointer devices only). */
export function ProjectPreview({ project, enabled }: { project: ProjectPublic | null; enabled: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!enabled || !wrap) return
    gsap.set(wrap, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.85 })
    const xTo = gsap.quickTo(wrap, 'x', { duration: 0.7, ease: 'power3' })
    const yTo = gsap.quickTo(wrap, 'y', { duration: 0.7, ease: 'power3' })
    const onMove = (event: PointerEvent) => {
      xTo(event.clientX)
      yTo(event.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  useEffect(() => {
    const wrap = wrapRef.current
    const img = imgRef.current
    if (!enabled || !wrap || !img) return
    if (project) {
      if (img.getAttribute('src') !== project.cover_image) img.src = project.cover_image
      gsap.to(wrap, { opacity: 1, scale: 1, rotate: -2, duration: 0.55, ease: 'expo.out', overwrite: 'auto' })
    } else {
      gsap.to(wrap, { opacity: 0, scale: 0.85, rotate: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
    }
  }, [project, enabled])

  if (!enabled) return null
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-30 h-44 w-72 overflow-hidden rounded-md border border-ink/20 shadow-2xl will-change-transform"
    >
      <img ref={imgRef} alt="" className="size-full object-cover" draggable={false} />
    </div>
  )
}
