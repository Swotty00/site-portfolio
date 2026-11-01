import { describe, expect, it } from 'vitest'
import { findTech, normalizeTech } from './techCatalog'

describe('techCatalog', () => {
  it('matches names regardless of case, spacing and punctuation', () => {
    expect(findTech('React')?.url).toBe('https://react.dev')
    expect(findTech('  NEXT.JS ')?.url).toBe('https://nextjs.org')
    expect(findTech('Tailwind CSS')?.title).toBe('Tailwind CSS')
    expect(findTech('Node.js')).toEqual(findTech('nodejs'))
  })

  it('returns undefined for technologies that are not catalogued', () => {
    expect(findTech('Some Obscure Framework')).toBeUndefined()
  })

  it('only points to https URLs', () => {
    for (const name of ['react', 'python', 'docker', 'c++', 'c#', 'git']) {
      expect(findTech(name)?.url).toMatch(/^https:\/\//)
    }
  })

  it('normalizes', () => {
    expect(normalizeTech('Vue  JS')).toBe('vue js')
  })
})
