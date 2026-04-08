'use client';

import { useEffect, useState } from 'react';

interface FearGreedData {
  current: { value: number; label: string; timestamp: number };
  history: { value: number; label: string; date: string }[];
}

// Color mapping for gauge
function getColor(value: number): string {
  if (value <= 20) return '#ea3943'; // Extreme Fear - red
  if (value <= 40) return '#ea8c00'; // Fear - orange
  if (value <= 60) return '#f5d100'; // Neutral - yellow
  if (value <= 80) return '#16c784'; // Greed - light green
  return '#00b061'; // Extreme Greed - green
}

function getLabel(value: number, locale: string): string {
  const isEn = locale === 'en';
  if (value <= 20) return isEn ? 'Extreme Fear' : '极度恐惧';
  if (value <= 40) return isEn ? 'Fear' : '恐惧';
  if (value <= 60) return isEn ? 'Neutral' : '中性';
  if (value <= 80) return isEn ? 'Greed' : '贪婪';
  return isEn ? 'Extreme Greed' : '极度贪婪';
}

// Semicircle gauge SVG
function GaugeSVG({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90; // -90 to 90 degrees
  const needleLength = 58;
  const cx = 75, cy = 72;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + needleLength * Math.cos(rad);
  const ny = cy + needleLength * Math.sin(rad);

  return (
    <svg viewBox="0 0 150 90" className="w-full max-w-[200px] mx-auto">
      {/* Background arc segments */}
      <path d="M 15 72 A 60 60 0 0 1 45 25" stroke="#ea3943" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M 45 25 A 60 60 0 0 1 75 12" stroke="#ea8c00" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M 75 12 A 60 60 0 0 1 105 25" stroke="#f5d100" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M 105 25 A 60 60 0 0 1 125 45" stroke="#16c784" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M 125 45 A 60 60 0 0 1 135 72" stroke="#00b061" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Needle */}
      <line
        x1={cx} y1={cy} x2={nx} y2={ny}
        stroke="var(--text-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill="var(--text-primary)" />
    </svg>
  );
}

// Mini sparkline for 30-day history
function Sparkline({ history }: { history: { value: number }[] }) {
  if (!history.length) return null;
  const values = [...history].reverse().map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 140, h = 28;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mt-2 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FearGreedGauge({ locale = 'en' }: { locale?: string }) {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const isEn = locale === 'en';

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/fear-greed');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // refresh every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-[var(--border-color)] rounded" />
          <div className="h-20 bg-[var(--border-color)] rounded" />
          <div className="h-3 w-24 bg-[var(--border-color)] rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { current, history } = data;
  const color = getColor(current.value);
  const label = getLabel(current.value, locale);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {isEn ? 'Fear & Greed Index' : '恐惧贪婪指数'}
        </h3>
        <span className="text-[10px] text-[var(--text-secondary)]">
          Alternative.me
        </span>
      </div>

      {/* Gauge */}
      <GaugeSVG value={current.value} />

      {/* Value + Label */}
      <div className="text-center -mt-1">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {current.value}
        </span>
        <p className="text-sm font-medium mt-0.5" style={{ color }}>
          {label}
        </p>
      </div>

      {/* 30-day sparkline */}
      <div className="mt-3">
        <p className="text-[10px] text-[var(--text-secondary)] text-center mb-1">
          {isEn ? '30-Day Trend' : '30天趋势'}
        </p>
        <Sparkline history={history} />
      </div>

      {/* Quick stats row */}
      {history.length >= 7 && (
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {isEn ? 'Yesterday' : '昨天'}
            </p>
            <p className="text-xs font-semibold tabular-nums" style={{ color: getColor(history[1]?.value || 0) }}>
              {history[1]?.value || '-'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {isEn ? '7D Avg' : '7日均'}
            </p>
            <p className="text-xs font-semibold tabular-nums" style={{ color: getColor(
              Math.round(history.slice(0, 7).reduce((s, h) => s + h.value, 0) / 7)
            ) }}>
              {Math.round(history.slice(0, 7).reduce((s, h) => s + h.value, 0) / 7)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {isEn ? '30D Avg' : '30日均'}
            </p>
            <p className="text-xs font-semibold tabular-nums" style={{ color: getColor(
              Math.round(history.reduce((s, h) => s + h.value, 0) / history.length)
            ) }}>
              {Math.round(history.reduce((s, h) => s + h.value, 0) / history.length)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
