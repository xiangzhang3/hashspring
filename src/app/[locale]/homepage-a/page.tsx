import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import HomepagePreview from '@/components/HomepagePreview';

export const metadata: Metadata = {
  title: 'Homepage Preview A | HashSpring',
  robots: { index: false, follow: false },
};

export default function HomepageAPreview({ params }: { params: { locale: string } }) {
  return <HomepagePreview locale={params.locale as Locale} variant="a" />;
}
