import type {
  AnalyticsReport,
  ProfileAdmin,
  ProfileInput,
  ProjectAdmin,
  ProjectInput,
  TranslateResponse,
  TranslateStatus,
} from '@/types/api'
import type { LocaleCode } from '@/types/i18n'
import { authedRequest } from './auth'

export const adminApi = {
  listProjects: () => authedRequest<ProjectAdmin[]>('/admin/projects'),
  getProject: (id: number) => authedRequest<ProjectAdmin>(`/admin/projects/${id}`),
  createProject: (data: ProjectInput) => authedRequest<ProjectAdmin>('/admin/projects', { method: 'POST', body: data }),
  updateProject: (id: number, data: Partial<ProjectInput>) =>
    authedRequest<ProjectAdmin>(`/admin/projects/${id}`, { method: 'PATCH', body: data }),
  deleteProject: (id: number) => authedRequest<void>(`/admin/projects/${id}`, { method: 'DELETE' }),
  reorderProjects: (ids: number[]) =>
    authedRequest<ProjectAdmin[]>('/admin/projects/reorder', { method: 'POST', body: { ids } }),

  getProfile: () => authedRequest<ProfileAdmin>('/admin/profile'),
  updateProfile: (data: ProfileInput) => authedRequest<ProfileAdmin>('/admin/profile', { method: 'PUT', body: data }),

  translateStatus: () => authedRequest<TranslateStatus>('/admin/translate/status'),
  /** Translate `texts` (order preserved) with the Claude API. Slow: allow up to two minutes. */
  translate: (texts: string[], target: LocaleCode, source: LocaleCode = 'pt-BR') =>
    authedRequest<TranslateResponse>('/admin/translate', {
      method: 'POST',
      body: { source, target, texts },
      timeoutMs: 120_000,
    }),

  analytics: (days: number) => authedRequest<AnalyticsReport>('/admin/analytics', { query: { days } }),

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authedRequest<{ url: string }>('/admin/uploads', { method: 'POST', formData, timeoutMs: 60_000 })
    return res.url
  },
}
