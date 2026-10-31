import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/features/i18n/I18nProvider'
import { contentApi } from '@/services/content'

/** All public content is keyed by locale: switching language refetches translated text. */
export function useProjects() {
  const { locale } = useI18n()
  return useQuery({
    queryKey: ['content', 'projects', locale],
    queryFn: ({ signal }) => contentApi.projects(locale, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProject(slug: string | undefined) {
  const { locale } = useI18n()
  return useQuery({
    queryKey: ['content', 'project', slug, locale],
    queryFn: ({ signal }) => contentApi.project(slug ?? '', locale, signal),
    enabled: Boolean(slug),
    // Keep showing the old text while a *language* change refetches, but never show another
    // project's data while navigating to a different slug.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === slug ? previous : undefined),
  })
}

export function useProfile() {
  const { locale } = useI18n()
  return useQuery({
    queryKey: ['content', 'profile', locale],
    queryFn: ({ signal }) => contentApi.profile(locale, signal),
    placeholderData: keepPreviousData,
  })
}

/** Warm the cache for a project page (called on hover/focus so navigation feels instant). */
export function usePrefetchProject() {
  const { locale } = useI18n()
  const queryClient = useQueryClient()
  return (slug: string) =>
    void queryClient.prefetchQuery({
      queryKey: ['content', 'project', slug, locale],
      queryFn: ({ signal }) => contentApi.project(slug, locale, signal),
      staleTime: 60_000,
    })
}
