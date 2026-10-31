import type { Credit, ProjectAdmin, ProjectInput, ProjectTranslation } from '@/types/api'
import { DEFAULT_LOCALE, type LocaleCode } from '@/types/i18n'

export interface Draft {
  slug: string
  year: number
  client: string
  client_url: string
  live_url: string
  cover_image: string
  images: string[]
  tagsText: string
  credits: Credit[]
  translations: Partial<Record<LocaleCode, ProjectTranslation>>
  published: boolean
}

export const emptyTranslation = (): ProjectTranslation => ({ title: '', summary: '', description: '', role: '' })

export const emptyDraft = (): Draft => ({
  slug: '',
  year: new Date().getFullYear(),
  client: '',
  client_url: '',
  live_url: '',
  cover_image: '',
  images: [],
  tagsText: '',
  credits: [],
  translations: { [DEFAULT_LOCALE]: emptyTranslation() },
  published: true,
})

export const fromProject = (p: ProjectAdmin): Draft => ({
  slug: p.slug,
  year: p.year,
  client: p.client,
  client_url: p.client_url ?? '',
  live_url: p.live_url ?? '',
  cover_image: p.cover_image,
  images: p.images,
  tagsText: p.tags.join(', '),
  credits: p.credits,
  translations: p.translations,
  published: p.published,
})

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function toPayload(draft: Draft): ProjectInput {
  const translations: ProjectInput['translations'] = {}
  for (const [code, tr] of Object.entries(draft.translations) as [LocaleCode, ProjectTranslation][]) {
    if (tr.title.trim()) translations[code] = tr // untouched languages are simply omitted
  }
  return {
    slug: draft.slug.trim(),
    year: Number(draft.year),
    client: draft.client.trim(),
    client_url: draft.client_url.trim() || null,
    live_url: draft.live_url.trim() || null,
    cover_image: draft.cover_image.trim(),
    images: draft.images.map((i) => i.trim()).filter(Boolean),
    tags: draft.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    credits: draft.credits.filter((c) => c.role.trim() && c.name.trim()),
    translations,
    published: draft.published,
  }
}
