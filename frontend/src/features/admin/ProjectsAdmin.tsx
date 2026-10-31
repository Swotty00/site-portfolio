import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import type { ProjectAdmin } from '@/types/api'
import { errorMessage } from './errors'
import { Banner } from './ui'

const KEY = ['admin', 'projects']

export function ProjectsAdmin() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const { data: projects, error, isPending, refetch } = useQuery({ queryKey: KEY, queryFn: adminApi.listProjects })

  const useAction = <A,>(fn: (arg: A) => Promise<unknown>, success?: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setMessage(success ? { kind: 'success', text: success } : null)
        void queryClient.invalidateQueries({ queryKey: KEY })
        void queryClient.invalidateQueries({ queryKey: ['content'] })
      },
      onError: (err) => setMessage({ kind: 'error', text: errorMessage(err) }),
    })

  // Optimistic: the checkbox flips immediately and rolls back if the server rejects the change.
  const togglePublished = useMutation({
    mutationFn: (p: ProjectAdmin) => adminApi.updateProject(p.id, { published: !p.published }),
    onMutate: async (p) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const previous = queryClient.getQueryData<ProjectAdmin[]>(KEY)
      queryClient.setQueryData<ProjectAdmin[]>(KEY, (list) =>
        list?.map((x) => (x.id === p.id ? { ...x, published: !x.published } : x)),
      )
      return { previous }
    },
    onError: (err, _p, context) => {
      queryClient.setQueryData(KEY, context?.previous)
      setMessage({ kind: 'error', text: errorMessage(err) })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
      void queryClient.invalidateQueries({ queryKey: ['content'] })
    },
  })
  const remove = useAction((p: ProjectAdmin) => adminApi.deleteProject(p.id), 'Project deleted.')
  const reorder = useAction((ids: number[]) => adminApi.reorderProjects(ids))

  const move = (index: number, delta: number) => {
    if (!projects) return
    const ids = projects.map((p) => p.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    reorder.mutate(ids)
  }

  const confirmDelete = (p: ProjectAdmin) => {
    if (window.confirm(`Delete “${p.translations['pt-BR']?.title ?? p.slug}”? This cannot be undone.`)) remove.mutate(p)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tightest">Projects</h1>
        <Link to="/admin/projects/new" className="admin-btn admin-btn-primary">
          + New project
        </Link>
      </div>

      {message && <Banner kind={message.kind}>{message.text}</Banner>}
      {error && !projects && (
        <Banner kind="error">
          {errorMessage(error)}{' '}
          <button className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </Banner>
      )}
      {isPending && <p className="text-ink/60">Loading…</p>}

      {projects && (
        <ul className="divide-y divide-ink/15 overflow-hidden rounded-xl border border-ink/20">
          {projects.length === 0 && <li className="p-6 text-ink/60">No projects yet.</li>}
          {projects.map((project, i) => (
            <li key={project.id} className="flex flex-wrap items-center gap-4 bg-ink/[0.03] p-4">
              <div className="flex flex-col">
                <button
                  className="admin-btn !px-2 !py-0.5 text-xs"
                  aria-label="Move up"
                  disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  className="admin-btn mt-1 !px-2 !py-0.5 text-xs"
                  aria-label="Move down"
                  disabled={i === projects.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </div>
              <div className="size-14 shrink-0 overflow-hidden rounded-md bg-ink/10">
                {project.cover_image && <img src={project.cover_image} alt="" className="size-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold">
                  {project.translations['pt-BR']?.title ?? project.slug}
                </p>
                <p className="truncate text-sm text-ink/55">
                  /{project.slug} · {project.year} · {Object.keys(project.translations).length} languages
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.published}
                  onChange={() => togglePublished.mutate(project)}
                  className="size-4 accent-[rgb(var(--c-accent))]"
                />
                Published
              </label>
              <div className="flex gap-2">
                <Link to={`/admin/projects/${project.id}`} className="admin-btn">
                  Edit
                </Link>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => confirmDelete(project)}
                  disabled={remove.isPending}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
