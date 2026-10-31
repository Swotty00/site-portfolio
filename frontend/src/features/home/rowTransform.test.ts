import { describe, expect, it } from 'vitest'
import { clamp, computeRow, perspectiveOriginY, rowOffset, type RowInput } from './rowTransform'

const base: RowInput = { p: 0, entry: 1, flat: 0, dim: 0, index: 0, compact: false }

describe('computeRow', () => {
  it('is fully opaque at the viewport centre once entered', () => {
    expect(computeRow(base).opacity).toBe(1)
  })

  it('fades rows towards the viewport edges', () => {
    const edge = computeRow({ ...base, p: 1 }).opacity
    const far = computeRow({ ...base, p: 1.6 }).opacity
    expect(edge).toBeLessThan(1)
    expect(far).toBeLessThanOrEqual(edge)
  })

  it('pitches rows above and below the centre in opposite directions', () => {
    const above = computeRow({ ...base, p: -1 }).transform
    const below = computeRow({ ...base, p: 1 }).transform
    expect(above).toMatch(/rotateX\(-?\d/)
    const pitch = (t: string) => Number(/rotateX\((-?[\d.]+)deg\)/.exec(t)![1])
    expect(pitch(above)).toBeGreaterThan(0)
    expect(pitch(below)).toBeLessThan(0)
  })

  it('flattens completely on hover: no yaw or pitch left', () => {
    const { transform } = computeRow({ ...base, p: -0.8, flat: 1 })
    expect(transform).toContain('rotateX(0deg)')
    expect(transform).toContain('rotateY(0deg) scale(1.035)')
  })

  it('winds rows up on the staircase before entry, more for later rows', () => {
    const orbit = (index: number) =>
      Number(
        /translateZ\(-?[\d.]+px\) rotateY\((-?[\d.]+)deg\)/.exec(
          computeRow({ ...base, entry: 0, index }).transform,
        )![1],
      )
    expect(orbit(0)).toBeGreaterThan(0)
    expect(orbit(4)).toBeGreaterThan(orbit(0))
    expect(computeRow({ ...base, entry: 0 }).opacity).toBe(0)
  })

  it('has no spiral offset once entry completes', () => {
    expect(computeRow({ ...base, entry: 1, index: 5 }).transform).toContain('rotateY(0deg)')
  })

  it('dims non-hovered rows but never hovered ones', () => {
    expect(computeRow({ ...base, dim: 1 }).opacity).toBeLessThan(0.5)
    expect(computeRow({ ...base, dim: 1, flat: 1 }).opacity).toBe(1)
  })

  it('uses a gentler pose on compact screens', () => {
    const yaw = (compact: boolean) =>
      Number(/rotateY\((-?[\d.]+)deg\) scale/.exec(computeRow({ ...base, compact }).transform)![1])
    expect(yaw(true)).toBeLessThan(yaw(false))
  })
})

describe('perspective helpers', () => {
  it('ties the vanishing point to the viewport centre in stage coordinates', () => {
    expect(perspectiveOriginY(0, 800, 600)).toBe(-200) // stage starts below the fold
    expect(perspectiveOriginY(600, 800, 600)).toBe(400) // stage top at viewport top
    expect(perspectiveOriginY(1000, 800, 600)).toBe(800)
  })

  it('normalises row offsets against half the viewport height', () => {
    expect(rowOffset(400, 400, 800)).toBe(0)
    expect(rowOffset(800, 400, 800)).toBe(1)
    expect(rowOffset(0, 400, 800)).toBe(-1)
  })

  it('clamp bounds values', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
  })
})
