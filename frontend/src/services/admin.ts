import type { ProfileAdmin, ProfileInput, ProjectAdmin, ProjectInput } from '@/types/api'
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

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authedRequest<{ url: string }>('/admin/uploads', { method: 'POST', formData, timeoutMs: 60_000 })
    return res.url
  },
}
