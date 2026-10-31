import type { Messages } from './pt-BR'

const zh: Messages = {
  meta: {
    tagline: '创意开发者',
    description: '精选作品集：沉浸式网页体验、界面与产品。',
  },
  nav: { about: '关于', work: '作品', profile: '简历' },
  a11y: {
    skip: '跳到内容',
    home: '首页',
    theme: '切换配色主题',
    close: '关闭',
    mainNav: '主导航',
  },
  lang: { label: '语言' },
  common: { loading: '加载中…' },
  home: {
    eyebrow: '作品集 — {{year}}',
    scroll: '向下滚动',
    selected: '精选作品',
    empty: '暂无已发布的项目。',
    open: '查看项目',
  },
  about: {
    title: '关于我',
    available: '接受新项目合作',
    profileCta: '完整简历',
    contact: '联系我',
  },
  project: {
    client: '客户',
    year: '年份',
    role: '职责',
    credits: '制作团队',
    visit: '访问网站',
    gallery: '项目图集',
    prevSlide: '上一张',
    nextSlide: '下一张',
    slide: '第 {{current}} 张，共 {{total}} 张',
    next: '下一个项目',
    back: '全部项目',
  },
  profile: {
    stack: '技术栈',
    experience: '工作经历',
    education: '教育背景',
    contact: '联系方式',
    resume: '查看简历',
  },
  error: {
    title: '出错了',
    network: '无法连接服务器，请检查网络后重试。',
    retry: '重试',
    notFound: '页面不存在',
    backHome: '返回首页',
  },
  footer: { rights: '© {{year}} 版权所有。' },
  theme: { changed: '主题：{{name}}' },
}

export default zh
