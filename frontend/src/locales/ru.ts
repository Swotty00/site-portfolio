import type { Messages } from './pt-BR'

const ru: Messages = {
  meta: {
    tagline: 'Креативный разработчик',
    description: 'Портфолио избранных работ: иммерсивные веб-проекты, интерфейсы и продукты.',
  },
  nav: { about: 'обо мне', work: 'работы', profile: 'профиль' },
  a11y: {
    skip: 'Перейти к содержимому',
    home: 'Главная',
    theme: 'Сменить цветовую тему',
    close: 'Закрыть',
    mainNav: 'Основная навигация',
  },
  lang: { label: 'Язык' },
  common: { loading: 'Загрузка…' },
  home: {
    eyebrow: 'Портфолио — {{year}}',
    scroll: 'Листайте',
    selected: 'Избранные работы',
    empty: 'Проекты пока не опубликованы.',
    open: 'Смотреть проект',
  },
  about: {
    title: 'Обо мне',
    available: 'Открыт для новых проектов',
    profileCta: 'Полный профиль и резюме',
    contact: 'Связаться',
  },
  project: {
    client: 'Клиент',
    year: 'Год',
    role: 'Роль',
    credits: 'Авторы',
    visit: 'Открыть сайт',
    gallery: 'Галерея проекта',
    prevSlide: 'Предыдущее изображение',
    nextSlide: 'Следующее изображение',
    slide: 'Изображение {{current}} из {{total}}',
    next: 'Следующий проект',
    back: 'Все проекты',
  },
  profile: {
    stack: 'Стек технологий',
    experience: 'Опыт',
    education: 'Образование',
    contact: 'Контакты',
    download: 'Скачать резюме (PDF)',
    downloading: 'Создаём PDF…',
    downloadError: 'Не удалось создать PDF. Попробуйте ещё раз.',
  },
  error: {
    title: 'Что-то пошло не так',
    network: 'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.',
    retry: 'Повторить',
    notFound: 'Страница не найдена',
    backHome: 'На главную',
  },
  footer: { rights: '© {{year}} Все права защищены.' },
  theme: { changed: 'Тема: {{name}}' },
}

export default ru
