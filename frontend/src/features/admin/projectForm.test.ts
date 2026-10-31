import { describe, expect, it } from 'vitest'
import { emptyDraft, slugify, toPayload } from './projectForm'

describe('slugify', () => {
  it.each([
    ['Aurora', 'aurora'],
    ['Projeto Ação & Emoção!', 'projeto-acao-emocao'],
    ['  --Hello   World--  ', 'hello-world'],
    ['Ünïcödé Tëst', 'unicode-test'],
    ['日本語', ''],
  ])('%j -> %j', (input, expected) => expect(slugify(input)).toBe(expected))

  it('caps the length at 80 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80)
  })
})

describe('toPayload', () => {
  it('drops empty translations, normalises empty URLs to null and splits tags', () => {
    const draft = emptyDraft()
    draft.slug = ' my-slug '
    draft.client_url = '   '
    draft.live_url = 'https://example.com'
    draft.tagsText = 'Web, , 3D ,'
    draft.images = ['/a.png', '  ', '/b.png']
    draft.credits = [
      { role: 'Design', name: 'Ann' },
      { role: '', name: 'Nobody' },
    ]
    draft.translations = {
      'pt-BR': { title: 'Título', summary: '', description: '', role: '' },
      en: { title: '   ', summary: 'ignored', description: '', role: '' },
      ja: { title: 'タイトル', summary: '', description: '', role: '' },
    }
    const payload = toPayload(draft)
    expect(payload.slug).toBe('my-slug')
    expect(payload.client_url).toBeNull()
    expect(payload.live_url).toBe('https://example.com')
    expect(payload.tags).toEqual(['Web', '3D'])
    expect(payload.images).toEqual(['/a.png', '/b.png'])
    expect(payload.credits).toEqual([{ role: 'Design', name: 'Ann' }])
    expect(Object.keys(payload.translations).sort()).toEqual(['ja', 'pt-BR'])
  })
})
