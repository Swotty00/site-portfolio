/**
 * Pure helpers that turn a block of editor content into a flat list of strings to translate and
 * back. Only human-readable copy is sent: names of companies, schools, places, technologies and
 * URLs are left untouched. `apply` always works on a fresh clone, so results never alias state.
 */
import type { ProfileContent, ProjectTranslation } from '@/types/api'

interface Slot {
  read: () => string
  write: (value: string) => void
}
type Collector<T> = (draft: T, add: (slot: Slot) => void) => void

export interface TextBatch<T> {
  /** Non-blank strings to translate, in a stable order. */
  texts: string[]
  /** Rebuild the content with `translated` (same length/order as `texts`). */
  apply: (translated: string[]) => T
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const blank = (text: string) => text.trim() === ''

function makeBatch<T>(source: T, collect: Collector<T>): TextBatch<T> {
  const texts: string[] = []
  collect(clone(source), (slot) => {
    const text = slot.read()
    if (!blank(text)) texts.push(text)
  })

  return {
    texts,
    apply(translated) {
      if (translated.length !== texts.length) {
        throw new Error(`Expected ${texts.length} translated texts, got ${translated.length}`)
      }
      const draft = clone(source)
      let next = 0
      collect(draft, (slot) => {
        if (!blank(slot.read())) slot.write(translated[next++] ?? '')
      })
      return draft
    },
  }
}

const field = <O extends object, K extends keyof O & string>(obj: O, key: K): Slot => ({
  read: () => String(obj[key] ?? ''),
  write: (value) => void Reflect.set(obj, key, value),
})

export function profileBatch(content: ProfileContent): TextBatch<ProfileContent> {
  return makeBatch(content, (draft, add) => {
    add(field(draft, 'headline'))
    add(field(draft, 'bio'))
    draft.about.forEach((_, i) => add({ read: () => draft.about[i] ?? '', write: (v) => void (draft.about[i] = v) }))
    // Stack *items* are technology names and stay as they are; categories are plain words.
    draft.stack.forEach((group) => add(field(group, 'category')))
    draft.experience.forEach((job) => {
      add(field(job, 'role'))
      add(field(job, 'period')) // "2022 – present" contains a word
      job.bullets.forEach((_, i) => add({ read: () => job.bullets[i] ?? '', write: (v) => void (job.bullets[i] = v) }))
    })
    draft.education.forEach((item) => {
      add(field(item, 'degree'))
      add(field(item, 'period'))
    })
  })
}

export function projectBatch(translation: ProjectTranslation): TextBatch<ProjectTranslation> {
  return makeBatch(translation, (draft, add) => {
    // The title is usually a brand name, but it is the admin's call: translate it like the rest.
    for (const key of ['title', 'summary', 'description', 'role'] as const) add(field(draft, key))
  })
}
