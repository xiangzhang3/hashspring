'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoFull } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface HeaderProps {
  dict: Dictionary;
  locale: Locale;
}

const langOptions = [
  { code: 'en', label: '🇺🇸 EN' },
  { code: 'zh', label: '🇨🇳 中' },
  { code: 'fil', label: '🇵🇭 FIL' },
];

export function Header({ dict, locale }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const langRef = React.useRef<HTMLDivElement>(null);
  const currentLang = langOptions.find((l) => l.code === locale) || langOptions[0];

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
      setSearchQuery('');
      setMenuOpen(false);
    }
  }, [locale, router]);

  return (
    <header className="bg-[#1a1a2e] sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 flex items-center justify-between h-14 sm:h-16">
        {/* Logo */}
        <LogoFull size={32} locale={locale} />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {dict.nav.map((item, i) => {
            const routes = ['', 'flashnews', 'analysis', 'trending', 'market', 'about'];
            const href = i === 0 ? `/${locale}` : `/${locale}/${routes[i]}`;
            const isActive = i === 0
              ? pathname === `/${locale}`
              : pathname.startsWith(`/${locale}/${routes[i]}`);
            return (
              <Link
                key={item}
                href={href}
                className={`px-4 py-2 rounded-md text-sm no-underline transition-colors ${
                  isActive
                    ? 'font-bold text-[#0066FF]'
                    : 'font-medium text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search — hidden on mobile */}
          <div className="relative hidden sm:block">
            <input
              placeholder={dict.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); }}
              className="w-[140px] md:w-[200px] py-2 pl-9 pr-3 rounded-lg bg-white/10 border border-white/10 text-sm text-gray-200 outline-none focus:border-[#0066FF]/50 focus:bg-white/15 placeholder-gray-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              &#x1F50D;
            </span>
          </div>

          {/* Language Dropdown */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Switch language"
              aria-expanded={langOpen}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 text-xs font-bold text-gray-300 hover:bg-white/15 cursor-pointer"
            >
              {currentLang.label}
              <svg className={`w-3 h-3 text-gray-500 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute top-full mt-1 right-0 min-w-[120px] bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg overflow-hidden z-50">
                {langOptions.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLangOpen(false);
                      const newPath = pathname.replace(`/${locale}`, `/${lang.code}`) || `/${lang.code}`;
                      router.push(newPath);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      lang.code === locale
                        ? 'text-[#0066FF] bg-white/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1 p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-gray-300 transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-300 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-300 transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1a1a2e] px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {dict.nav.map((item, i) => {
              const routes = ['', 'flashnews', 'analysis', 'trending', 'market', 'about'];
              const href = i === 0 ? `/${locale}` : `/${locale}/${routes[i]}`;
              const isActive = i === 0
                ? pathname === `/${locale}`
                : pathname.startsWith(`/${locale}/${routes[i]}`);
              return (
                <Link
                  key={item}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-md text-sm no-underline transition-colors ${
                    isActive
                      ? 'font-bold text-[#0066FF] bg-white/5'
                      : 'font-medium text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item}
                </Link>
              );
            })}
          </nav>
          {/* Mobile search */}
          <div className="relative mt-3">
            <input
              placeholder={dict.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); }}
              className="w-full py-2.5 pl-9 pr-3 rounded-lg bg-white/10 border border-white/10 text-sm text-gray-200 outline-none focus:border-[#0066FF]/50 placeholder-gray-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              &#x1F50D;
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
