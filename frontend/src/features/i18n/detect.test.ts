import { beforeEach, describe, expect, it } from 'vitest'
import { detectLocale, matchLocale, readSavedLocale, saveLocale, STORAGE_KEY } from './detect'

describe('matchLocale', () => {
  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt-br', 'pt-BR'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['es-419', 'es'],
    ['it-IT', 'it'],
    ['fr-CA', 'fr'],
    ['ru-RU', 'ru'],
    ['zh-CN', 'zh'],
    ['zh-Hant-TW', 'zh'],
    ['ja-JP', 'ja'],
    ['ja_JP', 'ja'],
  ])('maps %s to %s', (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected)
  })

  it.each(['de', 'ko-KR', '', '   ', 'x-klingon'])('returns null for unsupported %j', (tag) => {
    expect(matchLocale(tag)).toBeNull()
  })
})

describe('detectLocale', () => {
  it('uses the first supported browser language in preference order', () => {
    expect(detectLocale(['de-DE', 'fr-FR', 'en-US'])).toBe('fr')
  })

  it('falls back to pt-BR when nothing is supported', () => {
    expect(detectLocale(['de-DE', 'ko'])).toBe('pt-BR')
    expect(detectLocale([])).toBe('pt-BR')
  })

  it('prefers a saved choice over the browser language', () => {
    expect(detectLocale(['en-US'], 'ja')).toBe('ja')
  })

  it('ignores an invalid saved value', () => {
    expect(detectLocale(['es-ES'], 'klingon')).toBe('es')
    expect(detectLocale(['es-ES'], null)).toBe('es')
  })
})

describe('persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips the saved locale', () => {
    expect(readSavedLocale()).toBeNull()
    saveLocale('ru')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ru')
    expect(readSavedLocale()).toBe('ru')
  })
})
