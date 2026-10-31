import { describe, expect, it } from 'vitest'
import { formatCount, formatDay, formatDelta, linePath, nearestIndex, niceScale, pickTickIndices } from './chartMath'

describe('niceScale', () => {
  it.each([
    [0, 4, [0, 1, 2, 3, 4]],
    [3, 4, [0, 1, 2, 3]],
    [7, 4, [0, 2, 4, 6, 8]],
    [23, 4, [0, 10, 20, 30]],
    [180, 4, [0, 50, 100, 150, 200]],
    [1000, 4, [0, 250, 500, 750, 1000]],
  ])('max %s -> clean ticks', (max, intervals, expected) => {
    const scale = niceScale(max, intervals)
    expect(scale.ticks).toEqual(expected)
    expect(scale.max).toBe(expected[expected.length - 1])
    expect(scale.max).toBeGreaterThanOrEqual(max)
  })

  it('never uses fractional steps for counts', () => {
    expect(niceScale(1).ticks.every(Number.isInteger)).toBe(true)
  })

  it('survives bad input', () => {
    expect(niceScale(Number.NaN).ticks).toHaveLength(5)
    expect(niceScale(-5).max).toBe(4)
  })
})

describe('formatCount', () => {
  it('is exact below 10k and compact above', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1284)).toBe('1,284')
    expect(formatCount(9999)).toBe('9,999')
    expect(formatCount(12_900)).toBe('12.9K')
    expect(formatCount(2_500_000)).toBe('2.5M')
  })
})

describe('formatDelta', () => {
  it('compares against the previous period', () => {
    expect(formatDelta(112, 100)).toEqual({ text: '+12%', direction: 'up' })
    expect(formatDelta(80, 100)).toEqual({ text: '-20%', direction: 'down' })
    expect(formatDelta(100, 100)).toEqual({ text: '0%', direction: 'flat' })
  })
  it('does not divide by zero', () => {
    expect(formatDelta(5, 0)).toEqual({ text: 'new', direction: 'up' })
    expect(formatDelta(0, 0)).toBeNull()
  })
})

describe('pickTickIndices', () => {
  it('includes first and last and spreads the rest', () => {
    expect(pickTickIndices(30, 5)).toEqual([0, 7, 15, 22, 29])
    expect(pickTickIndices(3, 5)).toEqual([0, 1, 2])
    expect(pickTickIndices(0, 5)).toEqual([])
  })
})

describe('formatDay', () => {
  it('formats the calendar day regardless of the viewer timezone', () => {
    expect(formatDay('2026-10-31')).toBe('Oct 31')
    expect(formatDay('2026-01-01')).toBe('Jan 1')
    expect(formatDay('2026-10-31', true)).toBe('Sat, Oct 31, 2026')
  })
})

describe('linePath / nearestIndex', () => {
  it('builds line and closed-area paths', () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 10, y: 5 },
    ]
    expect(linePath(pts)).toBe('M0.0,10.0 L10.0,5.0')
    expect(linePath(pts, 20)).toBe('M0.0,10.0 L10.0,5.0 L10.0,20.0 L0.0,20.0 Z')
    expect(linePath([])).toBe('')
  })

  it('snaps the pointer to the nearest point and clamps outside the plot', () => {
    expect(nearestIndex(50, 40, 400, 11)).toBe(0) // 0.025 of the way -> index 0
    expect(nearestIndex(240, 40, 400, 11)).toBe(5)
    expect(nearestIndex(9999, 40, 400, 11)).toBe(10)
    expect(nearestIndex(-100, 40, 400, 11)).toBe(0)
    expect(nearestIndex(100, 40, 400, 1)).toBe(0)
  })
})
