'use client';

import Link from 'next/link';
import { LogoFull } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface HeaderProps {
  dict: Dictionary;
  locale: Locale;
}

export function Header({ dict, locale }: HeaderProps) {
  const otherLocale = locale === 'en' ? 'zh' : 'en';

  return (
    <header className="bg-[#1a1a2e] sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between h-16">
        {/* Logo */}
        <LogoFull size={36} />

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {dict.nav.map((item, i) => {
            const routes = ['', 'flashnews', 'market', 'analysis', 'about'];
            const href = i === 0 ? `/${locale}` : `/${locale}/${routes[i]}`;
            return (
              <Link
                key={item}
                href={href}
                className={`px-4 py-2 rounded-md text-sm no-underline transition-colors ${
                  i === 1
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
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              placeholder={dict.search}
              className="w-[200px] py-2 pl-9 pr-3 rounded-lg bg-white/10 border border-white/10 text-sm text-gray-200 outline-none focus:border-[#0066FF]/50 focus:bg-white/15 placeholder-gray-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              &#x1F50D;
            </span>
          </div>

          {/* Language Switch */}
          <Link
            href={`/${otherLocale}`}
            className="px-3 py-1.5 rounded-md bg-white/10 text-xs font-bold text-gray-300 no-underline hover:bg-white/15 flex items-center gap-1"
          >
            {dict.langLabel}
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
