import { notFound } from 'next/navigation';
import { locales, getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Ticker } from '@/components/Ticker';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div lang={locale}>
      <Ticker />
      <Header dict={dict} locale={locale} />
      <main>{children}</main>
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
