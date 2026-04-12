import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import HomepagePreview from '@/components/HomepagePreview';

export const metadata: Metadata = {
  title: 'Homepage Preview B | HashSpring',
  robots: { index: false, follow: false },
};

export default function HomepageBPreview({ params }: { params: { locale: string } }) {
  return <HomepagePreview locale={params.locale as Locale} variant="b" />;
}
