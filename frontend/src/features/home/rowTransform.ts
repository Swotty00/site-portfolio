/**
 * Pure maths for the 3D project list, kept free of DOM access so it is cheap to run every
 * frame and easy to unit-test.
 *
 * Coordinates: `p` is the row's vertical offset from the viewport centre, normalised so that
 * p = 0 is dead centre and |p| = 1 is the top/bottom edge of the viewport.
 */

export interface RowInput {
  /** Scroll-driven position, see above. */
  p: number
  /** Spiral entry progress: 0 = wound up on the staircase, 1 = in place. */
  entry: number
  /** Hover flattening: 0 = full 3D pose, 1 = flat and lifted towards the viewer. */
  flat: number
  /** Dimming applied to non-hovered rows while another row is hovered (0..1). */
  dim: number
  index: number
  /** Gentler pose for narrow screens. */
  compact: boolean
}

export interface RowOutput {
  transform: string
  opacity: number
}

export const PERSPECTIVE_PX = 1100
const SPIRAL_RADIUS = 900

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number) => Math.round(value * 100) / 100
const round3 = (value: number) => Math.round(value * 1000) / 1000

export function computeRow({ p, entry, flat, dim, index, compact }: RowInput): RowOutput {
  const ap = Math.min(Math.abs(p), 1.6)
  const keep = 1 - flat // how much of the 3D pose survives the hover

  // --- Resting 3D pose: a wall that recedes to the right and curls like a drum. -------------
  const yaw = (compact ? 9 : 22) * keep
  const pitch = clamp(-p, -1.6, 1.6) * (compact ? 6 : 13) * keep
  const depth = -(ap ** 1.5) * (compact ? 90 : 230) * keep + flat * 36
  const shift = ap * ap * (compact ? -8 : -70) * keep

  // --- Spiral-staircase entry: rows orbit a vertical axis behind the list while sliding
  //     down their step, then unwind into the straight list. ---------------------------------
  const unwound = 1 - entry
  const orbit = unwound * (62 + index * 26)
  const step = -unwound * (index + 1) * 38

  const transform =
    `translate3d(${round(shift)}px, ${round(step)}px, ${round(depth)}px) ` +
    `translateZ(${round(-SPIRAL_RADIUS * unwound)}px) rotateY(${round(orbit)}deg) translateZ(${round(SPIRAL_RADIUS * unwound)}px) ` +
    `rotateX(${round(pitch)}deg) rotateY(${round(yaw)}deg) scale(${round3(1 + 0.035 * flat)})`

  const fadeIn = Math.min(1, entry * 2.4)
  const falloff = 1 - 0.45 * Math.min(ap, 1)
  const opacity = round(fadeIn * falloff * (1 - 0.62 * dim * (1 - flat)))

  return { transform, opacity }
}

/** Normalised distance of a row centre from the viewport centre (see RowInput.p). */
export function rowOffset(rowCenterInStage: number, perspectiveOriginY: number, viewportHeight: number): number {
  return (rowCenterInStage - perspectiveOriginY) / (viewportHeight / 2)
}

/**
 * The vanishing point follows the viewport centre: expressed in the stage's own coordinate
 * space it is `scrollY + vh/2 - stageTop`. Tying it to scroll keeps the perspective looking
 * "head on" at whatever part of the (taller-than-viewport) list the visitor is reading.
 */
export function perspectiveOriginY(scrollY: number, viewportHeight: number, stageTopInDocument: number): number {
  return scrollY + viewportHeight / 2 - stageTopInDocument
}
