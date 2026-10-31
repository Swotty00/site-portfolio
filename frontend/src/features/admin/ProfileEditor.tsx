import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { adminApi } from '@/services/admin'
import type { Education, Experience, Link, ProfileContent, ProfileInput, StackGroup } from '@/types/api'
import { DEFAULT_LOCALE, type LocaleCode } from '@/types/i18n'
import { errorMessage } from './errors'
import { TranslateControls } from './TranslateControls'
import { profileBatch } from './translate'
import { Banner, Card, ListEditor, LocaleTabs, TextArea, TextField } from './ui'

const emptyContent = (): ProfileContent => ({
  headline: '',
  bio: '',
  about: [],
  stack: [],
  experience: [],
  education: [],
})

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
const hasContent = (c?: ProfileContent) =>
  Boolean(c && (c.headline || c.bio || c.about.length || c.stack.length || c.experience.length))

export function ProfileEditor() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProfileInput | null>(null)
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const { data, error, isPending } = useQuery({ queryKey: ['admin', 'profile'], queryFn: adminApi.getProfile })
  useEffect(() => {
    if (data) {
      const { updated_at: _ignored, ...rest } = data
      setForm(rest)
    }
  }, [data])

  const save = useMutation({
    mutationFn: (payload: ProfileInput) => adminApi.updateProfile(payload),
    onSuccess: () => {
      setMessage({ kind: 'success', text: 'Profile saved.' })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] })
      void queryClient.invalidateQueries({ queryKey: ['content'] })
    },
    onError: (err) => setMessage({ kind: 'error', text: errorMessage(err) }),
  })

  if (error && !form) return <Banner kind="error">{errorMessage(error)}</Banner>
  if (isPending || !form) return <p className="text-ink/60">Loading…</p>

  const content = form.translations[locale] ?? emptyContent()
  const sourceBatch = profileBatch(form.translations[DEFAULT_LOCALE] ?? emptyContent())
  const patch = (changes: Partial<ProfileInput>) => setForm((f) => (f ? { ...f, ...changes } : f))
  const patchContent = (changes: Partial<ProfileContent>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            translations: {
              ...f.translations,
              [locale]: { ...(f.translations[locale] ?? emptyContent()), ...changes },
            },
          }
        : f,
    )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    const translations: ProfileInput['translations'] = {}
    for (const [code, c] of Object.entries(form.translations) as [LocaleCode, ProfileContent][]) {
      if (code === DEFAULT_LOCALE || hasContent(c)) translations[code] = c
    }
    save.mutate({ ...form, translations, email: form.email.trim() })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-24">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tightest">Profile</h1>
      {message && <Banner kind={message.kind}>{message.text}</Banner>}

      <Card title="Basics (all languages)">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={200}
          />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            maxLength={40}
          />
          <TextField
            label="Location"
            value={form.location}
            onChange={(e) => patch({ location: e.target.value })}
            maxLength={200}
          />
          <TextField
            className="md:col-span-2"
            label="Résumé link (PDF)"
            hint="Where your PDF lives: a link (read.cv, Google Drive…) or a file in the site's public folder, e.g. /curriculo.pdf. Leave empty to hide the button."
            inputMode="url"
            placeholder="https://… or /curriculo.pdf"
            value={form.resume_url}
            onChange={(e) => patch({ resume_url: e.target.value })}
            maxLength={500}
          />
        </div>
        <h3 className="field-label mt-6">Links</h3>
        <ListEditor<Link>
          items={form.links}
          onChange={(links) => patch({ links })}
          create={() => ({ label: '', url: '' })}
          addLabel="Add link"
          render={(item, update) => (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Label"
                value={item.label}
                onChange={(e) => update({ label: e.target.value })}
                required
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(e) => update({ url: e.target.value })}
                required
              />
            </div>
          )}
        />
      </Card>

      <Card title="Content by language">
        <LocaleTabs value={locale} onChange={setLocale} filled={(l) => hasContent(form.translations[l])} />
        {locale !== DEFAULT_LOCALE && (
          <TranslateControls
            locale={locale}
            texts={sourceBatch.texts}
            hasExisting={hasContent(form.translations[locale])}
            onTranslated={(translated) => patchContent(sourceBatch.apply(translated))}
            onCopy={() => patchContent({ ...emptyContent(), ...form.translations[DEFAULT_LOCALE] })}
          />
        )}
        <div className="space-y-5">
          <TextField
            label={`Headline (${locale})`}
            value={content.headline}
            onChange={(e) => patchContent({ headline: e.target.value })}
            maxLength={200}
          />
          <TextArea
            label={`Short bio (${locale})`}
            rows={3}
            value={content.bio}
            onChange={(e) => patchContent({ bio: e.target.value })}
            maxLength={2000}
          />
          <TextArea
            label={`About paragraphs (${locale})`}
            hint="Shown in the About overlay and the résumé. Separate paragraphs with a blank line."
            rows={6}
            value={content.about.join('\n\n')}
            onChange={(e) =>
              patchContent({
                about: e.target.value
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
          />

          <div>
            <h3 className="field-label">Technical stack</h3>
            <ListEditor<StackGroup>
              items={content.stack}
              onChange={(stack) => patchContent({ stack })}
              create={() => ({ category: '', items: [] })}
              addLabel="Add stack group"
              render={(item, update) => (
                <div className="grid gap-3 md:grid-cols-3">
                  <TextField
                    label="Category"
                    value={item.category}
                    onChange={(e) => update({ category: e.target.value })}
                  />
                  <TextField
                    className="md:col-span-2"
                    label="Items"
                    hint="Comma separated"
                    value={item.items.join(', ')}
                    onChange={(e) => update({ items: e.target.value.split(',').map((s) => s.trimStart()) })}
                    onBlur={(e) =>
                      update({
                        items: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
            />
          </div>

          <div>
            <h3 className="field-label">Experience</h3>
            <ListEditor<Experience>
              items={content.experience}
              onChange={(experience) => patchContent({ experience })}
              create={() => ({ company: '', role: '', period: '', location: '', bullets: [] })}
              addLabel="Add position"
              render={(item, update) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Role" value={item.role} onChange={(e) => update({ role: e.target.value })} />
                  <TextField
                    label="Company"
                    value={item.company}
                    onChange={(e) => update({ company: e.target.value })}
                  />
                  <TextField label="Period" value={item.period} onChange={(e) => update({ period: e.target.value })} />
                  <TextField
                    label="Location"
                    value={item.location}
                    onChange={(e) => update({ location: e.target.value })}
                  />
                  <TextArea
                    className="md:col-span-2"
                    label="Bullet points"
                    hint="One per line"
                    rows={4}
                    value={item.bullets.join('\n')}
                    onChange={(e) => update({ bullets: e.target.value.split('\n') })}
                    onBlur={(e) => update({ bullets: lines(e.target.value) })}
                  />
                </div>
              )}
            />
          </div>

          <div>
            <h3 className="field-label">Education</h3>
            <ListEditor<Education>
              items={content.education}
              onChange={(education) => patchContent({ education })}
              create={() => ({ institution: '', degree: '', period: '' })}
              addLabel="Add education"
              render={(item, update) => (
                <div className="grid gap-3 md:grid-cols-3">
                  <TextField
                    label="Institution"
                    value={item.institution}
                    onChange={(e) => update({ institution: e.target.value })}
                  />
                  <TextField label="Degree" value={item.degree} onChange={(e) => update({ degree: e.target.value })} />
                  <TextField label="Period" value={item.period} onChange={(e) => update({ period: e.target.value })} />
                </div>
              )}
            />
          </div>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end border-t border-ink/20 bg-primary/90 px-6 py-4 backdrop-blur">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
