import type { ProfilePublic, ProjectDetail, ProjectPublic } from '@/types/api'
import type { LocaleCode } from '@/types/i18n'
import { request } from './http'

export const contentApi = {
  projects: (lang: LocaleCode, signal?: AbortSignal) =>
    request<ProjectPublic[]>('/projects', { query: { lang }, signal }),
  project: (slug: string, lang: LocaleCode, signal?: AbortSignal) =>
    request<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`, { query: { lang }, signal }),
  profile: (lang: LocaleCode, signal?: AbortSignal) => request<ProfilePublic>('/profile', { query: { lang }, signal }),
}
