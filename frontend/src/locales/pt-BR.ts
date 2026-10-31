/** pt-BR is the default language and the source of truth for the message shape. */
const ptBR = {
  meta: {
    tagline: 'Desenvolvedor criativo',
    description: 'Portfólio de trabalhos selecionados: experiências web imersivas, interfaces e produtos.',
  },
  nav: { about: 'sobre', work: 'trabalhos', profile: 'perfil' },
  a11y: {
    skip: 'Pular para o conteúdo',
    home: 'Página inicial',
    theme: 'Mudar o tema de cores',
    close: 'Fechar',
    mainNav: 'Navegação principal',
  },
  lang: { label: 'Idioma' },
  common: { loading: 'Carregando…' },
  home: {
    eyebrow: 'Portfólio — {{year}}',
    scroll: 'Role',
    selected: 'Trabalhos selecionados',
    empty: 'Nenhum projeto publicado ainda.',
    open: 'Ver projeto',
  },
  about: {
    title: 'Sobre',
    available: 'Disponível para novos projetos',
    profileCta: 'Perfil completo e currículo',
    contact: 'Entre em contato',
  },
  project: {
    client: 'Cliente',
    year: 'Ano',
    role: 'Função',
    credits: 'Créditos',
    visit: 'Visitar o site',
    gallery: 'Galeria do projeto',
    prevSlide: 'Imagem anterior',
    nextSlide: 'Próxima imagem',
    slide: 'Imagem {{current}} de {{total}}',
    next: 'Próximo projeto',
    back: 'Todos os projetos',
  },
  profile: {
    stack: 'Stack técnica',
    experience: 'Experiência',
    education: 'Formação',
    contact: 'Contato',
    resume: 'Ver currículo',
  },
  error: {
    title: 'Algo deu errado',
    network: 'Não conseguimos acessar o servidor. Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente',
    notFound: 'Página não encontrada',
    backHome: 'Voltar ao início',
  },
  footer: { rights: '© {{year}} Todos os direitos reservados.' },
  theme: { changed: 'Tema: {{name}}' },
}

export default ptBR
export type Messages = typeof ptBR

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = Paths<Messages>
