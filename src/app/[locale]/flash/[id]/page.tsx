import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import Link from 'next/link';
import FlashDetailClient from './FlashDetailClient';

/* ─── Metadata (basic, since we can't know the article at build time reliably) ─── */
export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  // Extract readable title from slug (e.g., "bitcoin-surges-past-95k-a3f2b1c0" → "bitcoin surges past 95k")
  const slugParts = decodeURIComponent(params.id).replace(/-[a-f0-9]{8}$/, '').replace(/-/g, ' ');
  const title = slugParts.length > 5 ? slugParts : 'Flash News';

  return {
    title: `${title} | HashSpring`,
    description: `Latest crypto flash news: ${title}`,
    alternates: {
      canonical: `https://hashspring.com/${locale}/flash/${params.id}`,
      languages: {
        en: `/en/flash/${params.id}`,
        zh: `/zh/flash/${params.id}`,
      },
    },
    openGraph: {
      title: `${title} | HashSpring`,
      description: `Latest crypto flash news: ${title}`,
      type: 'article',
      url: `https://hashspring.com/${locale}/flash/${params.id}`,
      siteName: 'HashSpring',
    },
  };
}

/* ─── Page Component (Server wrapper → Client detail) ─── */
export default async function FlashDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  return (
    <FlashDetailClient
      locale={locale}
      articleId={params.id}
      dict={dict}
    />
  );
}
