'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

interface CalendarEvent {
  date: string;    // YYYY-MM-DD
  title: string;
  type: 'unlock' | 'exchange' | 'policy' | 'airdrop' | 'event' | 'other';
}

const TYPE_COLORS: Record<string, string> = {
  unlock: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  exchange: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  policy: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  airdrop: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  event: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const TYPE_LABELS: Record<string, { en: string; zh: string }> = {
  unlock: { en: 'Unlock', zh: '解鎖' },
  exchange: { en: 'Exchange', zh: '交易所' },
  policy: { en: 'Policy', zh: '政策' },
  airdrop: { en: 'Airdrop', zh: '空投' },
  event: { en: 'Event', zh: '活動' },
  other: { en: 'Other', zh: '其他' },
};

export function EventCalendar({ locale }: { locale: Locale }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isZh = locale === 'zh';

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/calendar-events', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch { /* skip */ } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-3 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 按日期分组，只显示今天和未来7天
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcoming = events
    .filter(e => {
      const d = new Date(e.date);
      return d >= today && d <= nextWeek;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) return null;

  // 按日期分组
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const evt of upcoming) {
    if (!grouped[evt.date]) grouped[evt.date] = [];
    grouped[evt.date].push(evt);
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    if (dateStr === todayStr) return isZh ? '今天' : 'Today';
    if (dateStr === tomorrowStr) return isZh ? '明天' : 'Tomorrow';
    return d.toLocaleDateString(isZh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-bold">{isZh ? '事件日曆' : 'Event Calendar'}</h3>
      </div>
      <div className="p-3 space-y-3">
        {Object.entries(grouped).map(([date, evts]) => (
          <div key={date}>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {formatDate(date)}
            </div>
            <div className="space-y-1.5">
              {evts.map((evt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${TYPE_COLORS[evt.type] || TYPE_COLORS.other}`}>
                    {isZh ? TYPE_LABELS[evt.type]?.zh : TYPE_LABELS[evt.type]?.en}
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                    {evt.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
