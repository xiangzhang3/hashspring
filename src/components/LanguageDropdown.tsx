'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const languageLinks = [
  { name: '🇺🇸 EN', code: 'en' },
  { name: '🇹🇼 繁體中文', code: 'zh' },
  { name: '🇵🇭 Filipino', code: 'fil' },
];

export function LanguageDropdown({ currentLocale = 'en' }: { currentLocale?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current = languageLinks.find((l) => l.code === currentLocale) || languageLinks[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <span>{current.name}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 min-w-[160px] bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg overflow-hidden z-50">
          {languageLinks.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setOpen(false);
                router.push(`/${lang.code}`);
              }}
              className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${
                lang.code === currentLocale
                  ? 'text-[#0066FF] bg-white/5 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
