import { translateBatch, translateContent } from '@/lib/api/translate';
import type { Locale } from '@/lib/i18n';

export interface LocalizableArticle {
  title: string;
  excerpt: string;
  content?: string;
  content_html?: string;
  title_en?: string;
  excerpt_en?: string;
  content_en?: string;
  content_html_en?: string;
  title_fil?: string;
  excerpt_fil?: string;
  content_fil?: string;
  content_html_fil?: string;
  locale?: string;
  source?: string;
}

function hasChinese(text: string | null | undefined): boolean {
  return !!text && /[\u4e00-\u9fff]/.test(text);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function needsEnglishTranslation(article: LocalizableArticle, locale: Locale): boolean {
  if (locale !== 'en') return false;
  if (article.locale === 'en') return false;
  if (article.title_en || article.excerpt_en || article.content_en || article.content_html_en) return false;
  return hasChinese(article.title) || hasChinese(article.excerpt) || hasChinese(article.content) || hasChinese(article.content_html);
}

export async function localizeArticleList<T extends LocalizableArticle>(
  articles: T[],
  locale: Locale,
): Promise<T[]> {
  if (locale === 'zh' || articles.length === 0) return articles;

  // For 'fil' locale, use pre-translated fil fields, fallback to en
  if (locale === 'fil') {
    return articles.map(article => ({
      ...article,
      title: article.title_fil || article.title_en || article.title,
      excerpt: article.excerpt_fil || article.excerpt_en || article.excerpt,
    }));
  }

  // For 'en' locale, proceed with existing translation logic

  const indexesToTranslate = articles
    .map((article, index) => ({ article, index }))
    .filter(({ article }) => needsEnglishTranslation(article, locale));

  if (indexesToTranslate.length === 0) return articles;

  try {
    const results = await translateBatch(
      indexesToTranslate.map(({ article }) => ({
        title: article.title || '',
        content: article.excerpt || article.content || stripHtml(article.content_html || ''),
      })),
      'en',
    );

    const localized = [...articles];
    indexesToTranslate.forEach(({ index }, batchIndex) => {
      const translated = results.translations[batchIndex];
      if (!translated) return;
      localized[index] = {
        ...localized[index],
        title: localized[index].title_en || translated.translatedTitle || localized[index].title,
        excerpt: localized[index].excerpt_en || translated.translatedContent || localized[index].excerpt,
      };
    });

    return localized;
  } catch {
    return articles;
  }
}

export async function localizeArticleDetail<T extends LocalizableArticle>(
  article: T,
  locale: Locale,
): Promise<T & { translatedContent?: string; isAiTranslated?: boolean }> {
  // Use pre-translated content if available
  if (
    locale === 'en' &&
    (article.title_en || article.excerpt_en || article.content_en || article.content_html_en)
  ) {
    return {
      ...article,
      title: article.title_en || article.title,
      excerpt: article.excerpt_en || article.excerpt,
      content: article.content_en || article.content,
      content_html: article.content_html_en || article.content_html,
    };
  }

  if (
    locale === 'fil' &&
    (article.title_fil || article.excerpt_fil || article.content_fil || article.content_html_fil)
  ) {
    return {
      ...article,
      title: article.title_fil || article.title_en || article.title,
      excerpt: article.excerpt_fil || article.excerpt_en || article.excerpt,
      content: article.content_fil || article.content_en || article.content,
      content_html: article.content_html_fil || article.content_html_en || article.content_html,
    };
  }

  if (!needsEnglishTranslation(article, locale)) return article;

  try {
    const sourceText = article.content || stripHtml(article.content_html || '');
    const translated = await translateContent(article.title || '', sourceText || article.excerpt || '', 'en');

    return {
      ...article,
      title: translated.translatedTitle || article.title,
      excerpt: translated.translatedContent || article.excerpt,
      translatedContent: translated.translatedContent || sourceText,
      isAiTranslated: true,
    };
  } catch {
    return article;
  }
}
