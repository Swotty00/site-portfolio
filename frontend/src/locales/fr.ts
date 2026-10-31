import type { Messages } from './pt-BR'

const fr: Messages = {
  meta: {
    tagline: 'Développeur créatif',
    description: 'Portfolio de projets sélectionnés : expériences web immersives, interfaces et produits.',
  },
  nav: { about: 'à propos', work: 'projets', profile: 'profil' },
  a11y: {
    skip: 'Aller au contenu',
    home: 'Accueil',
    theme: 'Changer le thème de couleurs',
    close: 'Fermer',
    mainNav: 'Navigation principale',
  },
  lang: { label: 'Langue' },
  common: { loading: 'Chargement…' },
  home: {
    eyebrow: 'Portfolio — {{year}}',
    scroll: 'Défiler',
    selected: 'Projets sélectionnés',
    empty: 'Aucun projet publié pour le moment.',
    open: 'Voir le projet',
  },
  about: {
    title: 'À propos',
    available: 'Disponible pour de nouveaux projets',
    profileCta: 'Profil complet et CV',
    contact: 'Me contacter',
  },
  project: {
    client: 'Client',
    year: 'Année',
    role: 'Rôle',
    credits: 'Crédits',
    visit: 'Voir le site',
    gallery: 'Galerie du projet',
    prevSlide: 'Image précédente',
    nextSlide: 'Image suivante',
    slide: 'Image {{current}} sur {{total}}',
    next: 'Projet suivant',
    back: 'Tous les projets',
  },
  profile: {
    stack: 'Stack technique',
    experience: 'Expérience',
    education: 'Formation',
    contact: 'Contact',
    resume: 'Voir le CV',
  },
  error: {
    title: 'Une erreur est survenue',
    network: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer',
    notFound: 'Page introuvable',
    backHome: "Retour à l'accueil",
  },
  footer: { rights: '© {{year}} Tous droits réservés.' },
  theme: { changed: 'Thème : {{name}}' },
}

export default fr
