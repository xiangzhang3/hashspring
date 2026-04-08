export const locales = ['en', 'zh', 'fil'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Full translation dictionaries
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/lib/dictionaries/en.json').then((m) => m.default),
  zh: () => import('@/lib/dictionaries/zh.json').then((m) => m.default),
  fil: () => import('@/lib/dictionaries/fil.json').then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export interface Dictionary {
  brand: string;
  sub: string;
  nav: string[];
  live: string;
  search: string;
  langLabel: string;
  langSwitchPath: string;
  home: string;
  flash: string;
  breakingTag: string;
  importantTag: string;
  newsTag: string;
  hero: {
    tag: string;
    title: string;
    desc: string;
    time: string;
    author: string;
  };
  featured: Array<{ tag: string; title: string; time: string }>;
  sectionFlash: string;
  sectionMarket: string;
  sectionTrending: string;
  sectionNewsletter: string;
  newsletterDesc: string;
  emailPh: string;
  subscribeCta: string;
  adLabel: string;
  viewAll: string;
  readMore: string;
  loadMore: string;
  share: string;
  source: string;
  readTime: string;
  prevLabel: string;
  nextLabel: string;
  trending: string[];
  footerAbout: string;
  footerLinks: string[][];
  copyright: string;
}
