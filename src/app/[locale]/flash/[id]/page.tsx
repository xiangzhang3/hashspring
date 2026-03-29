import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import FlashDetailClient from './FlashDetailClient';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/* ─── Fetch article data for metadata ─── */
async function getArticleData(id: string, locale: string) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    // Extract the short hash from the slug (last 8 chars)
    const shortHash = id.replace(/-[a-f0-9]{8}$/, '').length !== id.length
      ? id.slice(-8)
      : id;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?select=title_en,title_zh,description,category,source,pub_date,analysis,body_en,body_zh&content_hash=like.*${shortHash}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

/* ─── Metadata with real article data ─── */
export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const article = await getArticleData(params.id, locale);

  // Fallback: derive title from slug
  const slugTitle = decodeURIComponent(params.id).replace(/-[a-f0-9]{8}$/, '').replace(/-/g, ' ');

  const title = locale === 'zh'
    ? (article?.title_zh || slugTitle || 'Flash News')
    : (article?.title_en || slugTitle || 'Flash News');

  const description = article?.description
    || (locale === 'zh' ? article?.body_zh?.slice(0, 160) : article?.body_en?.slice(0, 160))
    || `Latest crypto flash news: ${title}`;

  const publishDate = article?.pub_date || new Date().toISOString();
  const category = article?.category || 'Crypto';
  const source = article?.source || 'HashSpring';

  const pageUrl = `https://hashspring.com/${locale}/flash/${params.id}`;

  return {
    title: `${title} | HashSpring`,
    description,
    keywords: [category, 'crypto', 'blockchain', 'news', source].filter(Boolean),
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `/en/flash/${params.id}`,
        zh: `/zh/flash/${params.id}`,
      },
    },
    openGraph: {
      title: `${title} | HashSpring`,
      description,
      type: 'article',
      url: pageUrl,
      siteName: 'HashSpring',
      publishedTime: publishDate,
      modifiedTime: publishDate,
      section: category,
      tags: [category, 'crypto', 'blockchain'],
      locale: locale === 'zh' ? 'zh_TW' : 'en_US',
      alternateLocale: locale === 'zh' ? 'en_US' : 'zh_TW',
    },
    twitter: {
      card: 'summary',
      site: '@hashspring',
      title: `${title} | HashSpring`,
      description,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    other: {
      'article:published_time': publishDate,
      'article:section': category,
      'article:tag': category,
    },
  };
}

/* ─── JSON-LD Structured Data ─── */
function ArticleJsonLd({ title, description, url, datePublished, category, source }: {
  title: string; description: string; url: string;
  datePublished: string; category: string; source: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: datePublished,
    author: {
      '@type': 'Organization',
      name: 'HashSpring',
      url: 'https://hashspring.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'HashSpring',
      url: 'https://hashspring.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://hashspring.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: category,
    keywords: [category, 'crypto', 'blockchain', source].filter(Boolean).join(', '),
    inLanguage: url.includes('/zh/') ? 'zh-TW' : 'en',
    isAccessibleForFree: true,
    creditText: `Source: ${source}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/* ─── Breadcrumb JSON-LD ─── */
function BreadcrumbJsonLd({ locale, title }: { locale: string; title: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://hashspring.com/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'zh' ? '快訊' : 'Flash News',
        item: `https://hashspring.com/${locale}/flashnews`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/* ─── Page Component ─── */
export default async function FlashDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const article = await getArticleData(params.id, locale);

  const slugTitle = decodeURIComponent(params.id).replace(/-[a-f0-9]{8}$/, '').replace(/-/g, ' ');
  const title = locale === 'zh'
    ? (article?.title_zh || slugTitle)
    : (article?.title_en || slugTitle);
  const description = article?.description || title;
  const pageUrl = `https://hashspring.com/${locale}/flash/${params.id}`;
  const publishDate = article?.pub_date || new Date().toISOString();
  const category = article?.category || 'Crypto';
  const source = article?.source || 'HashSpring';

  return (
    <>
      <ArticleJsonLd
        title={title}
        description={description}
        url={pageUrl}
        datePublished={publishDate}
        category={category}
        source={source}
      />
      <BreadcrumbJsonLd locale={locale} title={title} />
      <FlashDetailClient
        locale={locale}
        articleId={params.id}
        dict={dict}
      />
    </>
  );
}
