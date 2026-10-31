import { describe, expect, it } from 'vitest'
import type { ProfileContent, ProjectTranslation } from '@/types/api'
import { profileBatch, projectBatch } from './translate'

const profile: ProfileContent = {
  headline: 'Desenvolvedor full-stack',
  bio: 'Construo experiências web.',
  about: ['Primeiro parágrafo.', '', 'Segundo parágrafo.'],
  stack: [{ category: 'Linguagens', items: ['Python', 'TypeScript'] }],
  experience: [
    {
      company: 'Studio Nova',
      role: 'Engenheiro Sênior',
      period: '2022 – atual',
      location: 'São Paulo',
      bullets: ['Liderei o redesign.', 'Reduzi a latência em 40%.'],
    },
  ],
  education: [
    { institution: 'Universidade Exemplo', degree: 'Bacharelado em Ciência da Computação', period: '2015 – 2019' },
  ],
}

describe('profileBatch', () => {
  it('collects only human copy, in a stable order, skipping blanks', () => {
    expect(profileBatch(profile).texts).toEqual([
      'Desenvolvedor full-stack',
      'Construo experiências web.',
      'Primeiro parágrafo.',
      'Segundo parágrafo.',
      'Linguagens',
      'Engenheiro Sênior',
      '2022 – atual',
      'Liderei o redesign.',
      'Reduzi a latência em 40%.',
      'Bacharelado em Ciência da Computação',
      '2015 – 2019',
    ])
  })

  it('never sends names, places or technologies', () => {
    const sent = profileBatch(profile).texts.join('|')
    for (const keep of ['Studio Nova', 'São Paulo', 'Universidade Exemplo', 'Python', 'TypeScript']) {
      expect(sent).not.toContain(keep)
    }
  })

  it('puts translations back in the right fields and leaves the rest alone', () => {
    const batch = profileBatch(profile)
    const out = batch.apply(batch.texts.map((t) => `EN(${t})`))
    expect(out.headline).toBe('EN(Desenvolvedor full-stack)')
    expect(out.about).toEqual(['EN(Primeiro parágrafo.)', '', 'EN(Segundo parágrafo.)']) // blank kept
    expect(out.stack[0]).toEqual({ category: 'EN(Linguagens)', items: ['Python', 'TypeScript'] })
    expect(out.experience[0]).toMatchObject({
      company: 'Studio Nova',
      location: 'São Paulo',
      role: 'EN(Engenheiro Sênior)',
      period: 'EN(2022 – atual)',
      bullets: ['EN(Liderei o redesign.)', 'EN(Reduzi a latência em 40%.)'],
    })
    expect(out.education[0]).toMatchObject({
      institution: 'Universidade Exemplo',
      degree: 'EN(Bacharelado em Ciência da Computação)',
    })
  })

  it('does not mutate its input and returns independent copies', () => {
    const before = JSON.stringify(profile)
    const batch = profileBatch(profile)
    const a = batch.apply(batch.texts.map((t) => `A${t}`))
    const b = batch.apply(batch.texts.map((t) => `B${t}`))
    expect(JSON.stringify(profile)).toBe(before)
    expect(a.headline).toBe('ADesenvolvedor full-stack')
    expect(b.headline).toBe('BDesenvolvedor full-stack')
  })

  it('rejects a translation of the wrong length instead of corrupting the form', () => {
    expect(() => profileBatch(profile).apply(['only one'])).toThrow(/Expected 11/)
  })

  it('handles empty content', () => {
    const empty: ProfileContent = { headline: '', bio: '', about: [], stack: [], experience: [], education: [] }
    const batch = profileBatch(empty)
    expect(batch.texts).toEqual([])
    expect(batch.apply([])).toEqual(empty)
  })
})

describe('projectBatch', () => {
  const tr: ProjectTranslation = {
    title: 'Aurora',
    summary: 'Uma experiência imersiva.',
    description: 'Linha 1\n\nLinha 2',
    role: '',
  }

  it('translates the non-empty fields and keeps paragraph breaks inside a string', () => {
    const batch = projectBatch(tr)
    expect(batch.texts).toEqual(['Aurora', 'Uma experiência imersiva.', 'Linha 1\n\nLinha 2'])
    expect(batch.apply(['Aurora', 'An immersive experience.', 'Line 1\n\nLine 2'])).toEqual({
      title: 'Aurora',
      summary: 'An immersive experience.',
      description: 'Line 1\n\nLine 2',
      role: '',
    })
  })
})
