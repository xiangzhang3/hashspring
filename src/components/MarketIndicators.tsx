'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

interface Indicator {
  label: string;
  labelZh: string;
  value: string;
  change?: string;
  up?: boolean;
}

export function MarketIndicators({ locale }: { locale: Locale }) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIndicators() {
      try {
        const res = await fetch('/api/market-indicators', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIndicators(data);
        }
      } catch {
        // use empty
      } finally {
        setLoading(false);
      }
    }
    fetchIndicators();
    const interval = setInterval(fetchIndicators, 60_000); // 1分钟刷新
    return () => clearInterval(interval);
  }, []);

  const isZh = locale === 'zh';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (indicators.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <h3 className="text-sm font-bold">
          {isZh ? '行業關鍵指標' : 'Key Indicators'}
        </h3>
        <span className="text-[10px] text-gray-400 tabular-nums">LIVE</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {indicators.map((ind, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isZh ? ind.labelZh : ind.label}
            </span>
            <div className="text-right">
              <span className="text-xs font-semibold tabular-nums">{ind.value}</span>
              {ind.change && (
                <span className={`ml-1.5 text-[10px] font-bold tabular-nums ${ind.up ? 'text-green-500' : 'text-red-500'}`}>
                  {ind.up ? '▲' : '▼'}{ind.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
