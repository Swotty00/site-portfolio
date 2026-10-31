import type { Messages } from './pt-BR'

const it: Messages = {
  meta: {
    tagline: 'Sviluppatore creativo',
    description: 'Portfolio di lavori selezionati: esperienze web immersive, interfacce e prodotti.',
  },
  nav: { about: 'chi sono', work: 'progetti', profile: 'profilo' },
  a11y: {
    skip: 'Vai al contenuto',
    home: 'Home',
    theme: 'Cambia il tema colore',
    close: 'Chiudi',
    mainNav: 'Navigazione principale',
  },
  lang: { label: 'Lingua' },
  common: { loading: 'Caricamento…' },
  home: {
    eyebrow: 'Portfolio — {{year}}',
    scroll: 'Scorri',
    selected: 'Progetti selezionati',
    empty: 'Nessun progetto pubblicato.',
    open: 'Vedi progetto',
  },
  about: {
    title: 'Chi sono',
    available: 'Disponibile per nuovi progetti',
    profileCta: 'Profilo completo e CV',
    contact: 'Contattami',
  },
  project: {
    client: 'Cliente',
    year: 'Anno',
    role: 'Ruolo',
    credits: 'Crediti',
    visit: 'Visita il sito',
    gallery: 'Galleria del progetto',
    prevSlide: 'Immagine precedente',
    nextSlide: 'Immagine successiva',
    slide: 'Immagine {{current}} di {{total}}',
    next: 'Prossimo progetto',
    back: 'Tutti i progetti',
  },
  profile: {
    stack: 'Stack tecnico',
    experience: 'Esperienza',
    education: 'Formazione',
    contact: 'Contatti',
    resume: 'Vedi il CV',
  },
  error: {
    title: 'Qualcosa è andato storto',
    network: 'Impossibile raggiungere il server. Controlla la connessione e riprova.',
    retry: 'Riprova',
    notFound: 'Pagina non trovata',
    backHome: 'Torna alla home',
  },
  footer: { rights: '© {{year}} Tutti i diritti riservati.' },
  theme: { changed: 'Tema: {{name}}' },
}

export default it
