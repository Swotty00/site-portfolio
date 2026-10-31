import type { Messages } from './pt-BR'

const en: Messages = {
  meta: {
    tagline: 'Creative developer',
    description: 'Portfolio of selected work: immersive web experiences, interfaces and products.',
  },
  nav: { about: 'about', work: 'work', profile: 'profile' },
  a11y: {
    skip: 'Skip to content',
    home: 'Home',
    theme: 'Change color theme',
    close: 'Close',
    mainNav: 'Main navigation',
  },
  lang: { label: 'Language' },
  common: { loading: 'Loading…' },
  home: {
    eyebrow: 'Portfolio — {{year}}',
    scroll: 'Scroll',
    selected: 'Selected work',
    empty: 'No projects published yet.',
    open: 'View project',
  },
  about: {
    title: 'About',
    available: 'Available for new projects',
    profileCta: 'Full profile & résumé',
    contact: 'Get in touch',
  },
  project: {
    client: 'Client',
    year: 'Year',
    role: 'Role',
    credits: 'Credits',
    visit: 'Visit live site',
    gallery: 'Project gallery',
    prevSlide: 'Previous image',
    nextSlide: 'Next image',
    slide: 'Image {{current}} of {{total}}',
    next: 'Next project',
    back: 'All projects',
  },
  profile: {
    stack: 'Technical stack',
    experience: 'Experience',
    education: 'Education',
    contact: 'Contact',
    resume: 'View résumé',
  },
  error: {
    title: 'Something went wrong',
    network: "We couldn't reach the server. Check your connection and try again.",
    retry: 'Try again',
    notFound: 'Page not found',
    backHome: 'Back to home',
  },
  footer: { rights: '© {{year}} All rights reserved.' },
  theme: { changed: 'Theme: {{name}}' },
}

export default en
