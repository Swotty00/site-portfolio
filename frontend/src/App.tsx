import { lazy, Suspense } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { NotFoundView } from '@/components/NotFoundView'
import { PageLoader } from '@/components/PageLoader'
import HomePage from '@/features/home/HomePage'
import ProfilePage from '@/features/profile/ProfilePage'
import ProjectPage from '@/features/project/ProjectPage'
import { useI18n } from '@/features/i18n/I18nProvider'

// The admin dashboard is code-split: visitors of the public site never download it.
const AdminApp = lazy(() => import('@/features/admin/AdminApp'))

/** Remount the page when the slug changes so its entrance animation replays per project. */
function ProjectRoute() {
  const { slug } = useParams()
  return <ProjectPage key={slug} />
}

export default function App() {
  const { t } = useI18n()
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="projects/:slug" element={<ProjectRoute />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundView />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense
            fallback={
              <div role="status" aria-label={t('common.loading')}>
                <PageLoader />
              </div>
            }
          >
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
