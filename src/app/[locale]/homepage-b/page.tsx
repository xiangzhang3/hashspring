import type { Locale } from '@/lib/i18n';
import HomepagePreview from '@/components/HomepagePreview';

export default function HomepageBPreview({ params }: { params: { locale: string } }) {
  return <HomepagePreview locale={params.locale as Locale} variant="b" />;
}
