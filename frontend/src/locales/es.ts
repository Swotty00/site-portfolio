import type { Messages } from './pt-BR'

const es: Messages = {
  meta: {
    tagline: 'Desarrollador creativo',
    description: 'Portafolio de trabajos seleccionados: experiencias web inmersivas, interfaces y productos.',
  },
  nav: { about: 'sobre mí', work: 'proyectos', profile: 'perfil' },
  a11y: {
    skip: 'Saltar al contenido',
    home: 'Inicio',
    theme: 'Cambiar el tema de color',
    close: 'Cerrar',
    mainNav: 'Navegación principal',
  },
  lang: { label: 'Idioma' },
  common: { loading: 'Cargando…' },
  home: {
    eyebrow: 'Portafolio — {{year}}',
    scroll: 'Desplaza',
    selected: 'Proyectos seleccionados',
    empty: 'Aún no hay proyectos publicados.',
    open: 'Ver proyecto',
  },
  about: {
    title: 'Sobre mí',
    available: 'Disponible para nuevos proyectos',
    profileCta: 'Perfil completo y currículum',
    contact: 'Ponte en contacto',
  },
  project: {
    client: 'Cliente',
    year: 'Año',
    role: 'Rol',
    credits: 'Créditos',
    visit: 'Visitar el sitio',
    gallery: 'Galería del proyecto',
    prevSlide: 'Imagen anterior',
    nextSlide: 'Imagen siguiente',
    slide: 'Imagen {{current}} de {{total}}',
    next: 'Próximo proyecto',
    back: 'Todos los proyectos',
  },
  profile: {
    stack: 'Stack técnico',
    experience: 'Experiencia',
    education: 'Formación',
    contact: 'Contacto',
    download: 'Descargar currículum (PDF)',
    downloading: 'Generando PDF…',
    downloadError: 'No se pudo generar el PDF. Inténtalo de nuevo.',
  },
  error: {
    title: 'Algo salió mal',
    network: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
    notFound: 'Página no encontrada',
    backHome: 'Volver al inicio',
  },
  footer: { rights: '© {{year}} Todos los derechos reservados.' },
  theme: { changed: 'Tema: {{name}}' },
}

export default es
