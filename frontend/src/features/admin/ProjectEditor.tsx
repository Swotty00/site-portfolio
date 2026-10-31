import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import type { Credit, ProjectInput, ProjectTranslation } from '@/types/api'
import { DEFAULT_LOCALE, type LocaleCode } from '@/types/i18n'
import { errorMessage } from './errors'
import { emptyDraft, emptyTranslation, fromProject, slugify, toPayload, type Draft } from './projectForm'
import { TranslateControls } from './TranslateControls'
import { projectBatch } from './translate'
import { Banner, Card, ImageField, ListEditor, LocaleTabs, TextArea, TextField } from './ui'

export function ProjectEditor() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE)
  const [error, setError] = useState('')

  const {
    data: existing,
    error: loadError,
    isPending,
  } = useQuery({
    queryKey: ['admin', 'project', id],
    queryFn: () => adminApi.getProject(Number(id)),
    enabled: !isNew,
  })
  useEffect(() => {
    if (existing) setDraft(fromProject(existing))
  }, [existing])

  const save = useMutation({
    mutationFn: (payload: ProjectInput) =>
      isNew ? adminApi.createProject(payload) : adminApi.updateProject(Number(id), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['content'] })
      navigate('/admin/projects')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))
  const tr = draft.translations[locale] ?? emptyTranslation()
  const sourceBatch = projectBatch(draft.translations[DEFAULT_LOCALE] ?? emptyTranslation())
  const patchTr = (changes: Partial<ProjectTranslation>) =>
    setDraft((d) => {
      const next = {
        ...d,
        translations: {
          ...d.translations,
          [locale]: { ...(d.translations[locale] ?? emptyTranslation()), ...changes },
        },
      }
      if (!slugTouched && locale === DEFAULT_LOCALE && changes.title !== undefined) next.slug = slugify(changes.title)
      return next
    })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!draft.translations[DEFAULT_LOCALE]?.title.trim()) {
      setLocale(DEFAULT_LOCALE)
      setError('A pt-BR title is required (pt-BR is the fallback language).')
      return
    }
    save.mutate(toPayload(draft))
  }

  if (!isNew && loadError) return <Banner kind="error">{errorMessage(loadError)}</Banner>
  if (!isNew && isPending) return <p className="text-ink/60">Loading…</p>

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tightest">
          {isNew ? 'New project' : 'Edit project'}
        </h1>
        <Link to="/admin/projects" className="admin-btn">
          ← Back
        </Link>
      </div>
      {error && <Banner kind="error">{error}</Banner>}

      <Card title="Content by language">
        <LocaleTabs value={locale} onChange={setLocale} filled={(l) => Boolean(draft.translations[l]?.title.trim())} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={`Title (${locale})`}
            value={tr.title}
            onChange={(e) => patchTr({ title: e.target.value })}
            maxLength={120}
            required={locale === DEFAULT_LOCALE}
          />
          <TextField
            label={`Role (${locale})`}
            value={tr.role}
            onChange={(e) => patchTr({ role: e.target.value })}
            maxLength={200}
          />
          <TextField
            className="md:col-span-2"
            label={`Summary (${locale})`}
            value={tr.summary}
            onChange={(e) => patchTr({ summary: e.target.value })}
            maxLength={300}
          />
          <TextArea
            className="md:col-span-2"
            label={`Description (${locale})`}
            hint="Separate paragraphs with a blank line."
            rows={7}
            value={tr.description}
            onChange={(e) => patchTr({ description: e.target.value })}
            maxLength={5000}
          />
        </div>
        {locale !== DEFAULT_LOCALE && (
          <TranslateControls
            locale={locale}
            texts={sourceBatch.texts}
            hasExisting={Boolean(draft.translations[locale]?.title.trim())}
            onTranslated={(translated) => patchTr(sourceBatch.apply(translated))}
            onCopy={() => patchTr({ ...emptyTranslation(), ...draft.translations[DEFAULT_LOCALE] })}
          />
        )}
      </Card>

      <Card title="Details">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            label="Slug"
            hint="Used in the URL: /projects/<slug>"
            value={draft.slug}
            onChange={(e) => {
              setSlugTouched(true)
              patch({ slug: e.target.value })
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            maxLength={80}
          />
          <TextField
            label="Year"
            type="number"
            min={1990}
            max={2100}
            value={draft.year}
            onChange={(e) => patch({ year: Number(e.target.value) })}
            required
          />
          <TextField
            label="Client"
            value={draft.client}
            onChange={(e) => patch({ client: e.target.value })}
            maxLength={200}
          />
          <TextField
            label="Client URL"
            type="url"
            value={draft.client_url}
            onChange={(e) => patch({ client_url: e.target.value })}
            placeholder="https://"
          />
          <TextField
            label="Live site URL"
            type="url"
            value={draft.live_url}
            onChange={(e) => patch({ live_url: e.target.value })}
            placeholder="https://"
          />
          <TextField
            label="Tags"
            hint="Comma separated"
            value={draft.tagsText}
            onChange={(e) => patch({ tagsText: e.target.value })}
          />
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => patch({ published: e.target.checked })}
            className="size-4 accent-[rgb(var(--c-accent))]"
          />
          Published (visible on the public site)
        </label>
      </Card>

      <Card title="Images">
        <div className="space-y-5">
          <ImageField label="Cover image" value={draft.cover_image} onChange={(url) => patch({ cover_image: url })} />
          <ListEditor<{ url: string }>
            items={draft.images.map((url) => ({ url }))}
            onChange={(items) => patch({ images: items.map((i) => i.url) })}
            create={() => ({ url: '' })}
            addLabel="Add screenshot"
            render={(item, update, i) => (
              <ImageField label={`Screenshot ${i + 1}`} value={item.url} onChange={(url) => update({ url })} />
            )}
          />
        </div>
      </Card>

      <Card title="Credits">
        <ListEditor<Credit>
          items={draft.credits}
          onChange={(credits) => patch({ credits })}
          create={() => ({ role: '', name: '', url: null })}
          addLabel="Add credit"
          render={(item, update) => (
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Role" value={item.role} onChange={(e) => update({ role: e.target.value })} />
              <TextField label="Name" value={item.name} onChange={(e) => update({ name: e.target.value })} />
              <TextField
                label="Link (optional)"
                type="url"
                value={item.url ?? ''}
                onChange={(e) => update({ url: e.target.value || null })}
              />
            </div>
          )}
        />
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end gap-3 border-t border-ink/20 bg-primary/90 px-6 py-4 backdrop-blur">
        <Link to="/admin/projects" className="admin-btn">
          Cancel
        </Link>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : isNew ? 'Create project' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
