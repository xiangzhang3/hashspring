'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

const i18n = {
  en: {
    title: 'Something went wrong',
    desc: 'An unexpected error occurred. Please try again or return to the homepage.',
    retry: 'Try Again',
    home: 'Go Home',
  },
  zh: {
    title: '出了一些问题',
    desc: '发生了意外错误，请重试或返回首页。',
    retry: '重试',
    home: '返回首页',
  },
  fil: {
    title: 'May nangyaring mali',
    desc: 'May nangyaring hindi inaasahang error. Subukan muli o bumalik sa homepage.',
    retry: 'Subukan Muli',
    home: 'Uwi',
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = i18n[locale as keyof typeof i18n] || i18n.en;

  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-16 text-center">
      <h2 className="text-2xl font-bold mb-3">{t.title}</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {t.desc}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD] transition-colors"
        >
          {t.retry}
        </button>
        <a
          href={`/${locale}`}
          className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t.home}
        </a>
      </div>
    </div>
  );
}
