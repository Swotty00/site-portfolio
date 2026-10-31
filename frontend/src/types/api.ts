/** Types mirroring the FastAPI schemas (backend/app/schemas). */
import type { LocaleCode } from './i18n'

export interface Credit {
  role: string
  name: string
  url?: string | null
}

export interface ProjectPublic {
  slug: string
  year: number
  client: string
  client_url: string | null
  live_url: string | null
  cover_image: string
  images: string[]
  tags: string[]
  credits: Credit[]
  title: string
  summary: string
  description: string
  role: string
  locale: LocaleCode
}

export interface ProjectLink {
  slug: string
  title: string
}

export interface ProjectDetail extends ProjectPublic {
  next: ProjectLink | null
  previous: ProjectLink | null
}

export interface Link {
  label: string
  url: string
}
export interface StackGroup {
  category: string
  items: string[]
}
export interface Experience {
  company: string
  role: string
  period: string
  location: string
  bullets: string[]
}
export interface Education {
  institution: string
  degree: string
  period: string
}

export interface ProfileContent {
  headline: string
  bio: string
  about: string[]
  stack: StackGroup[]
  experience: Experience[]
  education: Education[]
}

export interface ProfilePublic extends ProfileContent {
  name: string
  email: string
  phone: string
  location: string
  links: Link[]
  locale: LocaleCode
}

// ---- Admin -------------------------------------------------------------------------------

export interface ProjectTranslation {
  title: string
  summary: string
  description: string
  role: string
}

export interface ProjectAdmin {
  id: number
  slug: string
  position: number
  year: number
  client: string
  client_url: string | null
  live_url: string | null
  cover_image: string
  images: string[]
  tags: string[]
  credits: Credit[]
  translations: Partial<Record<LocaleCode, ProjectTranslation>>
  published: boolean
  created_at: string
  updated_at: string
}

export type ProjectInput = Omit<ProjectAdmin, 'id' | 'position' | 'created_at' | 'updated_at'>

export interface ProfileAdmin {
  name: string
  email: string
  phone: string
  location: string
  links: Link[]
  translations: Partial<Record<LocaleCode, ProfileContent>>
  updated_at: string
}

export type ProfileInput = Omit<ProfileAdmin, 'updated_at'>

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface User {
  id: number
  username: string
}

// ---- Admin: translation & analytics ----------------------------------------------------------

export interface TranslateResponse {
  texts: string[]
  model: string
}

export interface TranslateStatus {
  enabled: boolean
  model: string
}

export interface DayPoint {
  date: string // YYYY-MM-DD
  pageviews: number
  visitors: number
}

export interface Bucket {
  name: string // '' = unknown / direct
  views: number
  visitors: number
}

export interface AnalyticsReport {
  days: number
  start: string
  end: string
  timezone: string
  totals: { pageviews: number; visitors: number; resume_downloads: number }
  previous: { pageviews: number; visitors: number }
  series: DayPoint[]
  top_pages: Bucket[]
  top_projects: Bucket[]
  referrers: Bucket[]
  countries: Bucket[]
  devices: Bucket[]
  browsers: Bucket[]
  locales: Bucket[]
}
