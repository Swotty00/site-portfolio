import type { ProfilePublic, ProjectDetail, ProjectPublic } from '@/types/api'
import type { LocaleCode } from '@/types/i18n'
import { ApiError, rawRequest, request } from './http'

export const contentApi = {
  projects: (lang: LocaleCode, signal?: AbortSignal) =>
    request<ProjectPublic[]>('/projects', { query: { lang }, signal }),
  project: (slug: string, lang: LocaleCode, signal?: AbortSignal) =>
    request<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`, { query: { lang }, signal }),
  profile: (lang: LocaleCode, signal?: AbortSignal) => request<ProfilePublic>('/profile', { query: { lang }, signal }),
}

/**
 * Fetch the generated résumé and hand it to the browser as a file download.
 * Going through fetch (instead of a bare <a href>) lets us surface server errors in the UI.
 */
export async function downloadResume(lang: LocaleCode, filenameHint: string): Promise<void> {
  const response = await rawRequest('/resume.pdf', { query: { lang }, timeoutMs: 30_000 })
  const blob = await response.blob()
  if (blob.type && !blob.type.includes('pdf')) throw new ApiError('Unexpected response type', 502)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filenameHint
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
