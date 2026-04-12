'use client';

import { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n';

/** Live clock that ticks every second, showing local time */
export function LiveClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      setNow(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums font-mono text-sm text-gray-500 dark:text-gray-400">
      {now}
    </span>
  );
}

/** Radar scanning animation indicator */
export function RadarPulse() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      {/* Outer ring - slow */}
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20 animate-[radar-ping_3s_ease-out_infinite]" />
      {/* Middle ring - medium */}
      <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-30 animate-[radar-ping_3s_ease-out_1s_infinite]" />
      {/* Inner ring - fast */}
      <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-40 animate-[radar-ping_3s_ease-out_2s_infinite]" />
      {/* Core dot */}
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8),0_0_16px_rgba(239,68,68,0.4)]" />
      {/* Sweep line */}
      <span className="absolute w-full h-full animate-[radar-sweep_2s_linear_infinite]" style={{
        background: 'conic-gradient(from 0deg, transparent 0%, transparent 85%, rgba(239,68,68,0.6) 95%, transparent 100%)',
        borderRadius: '50%',
      }} />
    </span>
  );
}
