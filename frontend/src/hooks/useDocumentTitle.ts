import { useEffect } from 'react'

export function useDocumentTitle(title: string | undefined, description?: string) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    if (!description) return
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [description])
}
