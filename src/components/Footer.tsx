import Link from 'next/link';
import { LogoIcon } from './Logo';
import type { Dictionary } from '@/lib/i18n';

const languageLinks = [
  { name: '🇺🇸 EN', code: 'en' },
  { name: '🇹🇼 繁體中文', code: 'zh' },
  { name: '🇵🇭 Filipino', code: 'fil' },
];

const socialLinks = [
  { name: 'X', url: 'https://x.com/hashspring' },
  { name: 'Telegram', url: 'https://t.me/hashspring' },
  { name: 'Discord', url: 'https://discord.gg/hashspring' },
  { name: 'LinkedIn', url: 'https://linkedin.com/company/hashspring' },
];

export function Footer({ dict, locale = 'en' }: { dict: Dictionary; locale?: string }) {
  return (
    <footer className="bg-[#1a1a2e] pt-10 pb-6 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-6 lg:gap-10 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <LogoIcon size={32} />
              <div>
                <div className="text-lg font-extrabold text-white">HashSpring</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Global Crypto Intelligence</div>
              </div>
            </div>
            <p className="text-gray-500 text-[13px] leading-relaxed max-w-[280px] mb-4">
              {dict.footerAbout}
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-gray-400 text-[10px] font-bold no-underline hover:bg-white/15 transition-colors">
                  {social.name[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {dict.footerLinks.map((group, gi) => {
            const getRouteForLink = (linkText: string, loc: string) => {
              const routeMap: { [key: string]: string } = {
                // English
                'FlashNews': '/flashnews',
                'Market': '/market',
                'Market Data': '/market',
                'Analysis': '/analysis',
                'Reports': '/analysis',
                'About': '/about',
                'Advertise': '/about',
                'Contact': '/about',
                // Chinese
                '快訊': '/flashnews',
                '行情數據': '/market',
                '報告': '/analysis',
                '關於': '/about',
                '廣告合作': '/about',
                '聯絡我們': '/about',
                '隱私': '/about',
                '條款': '/about',
                'Cookie': '/about',
                // English legal
                'Privacy': '/about',
                'Terms': '/about',
                'Cookies': '/about',
                'Cookie Policy': '/about',
                // Filipino
                'Flash News': '/flashnews',
                'Mga Ulat': '/analysis',
                'Tungkol': '/about',
                'Mag-advertise': '/about',
                'Makipag-ugnayan': '/about',
              };
              const route = routeMap[linkText];
              return route ? `/${loc}${route}` : `/${loc}`;
            };

            return (
              <div key={gi}>
                <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-3.5">
                  {group[0]}
                </div>
                {group.slice(1).map((link) => (
                  <Link key={link} href={getRouteForLink(link, locale)} className="block text-gray-500 text-[13px] no-underline mb-2.5 hover:text-gray-300 transition-colors">
                    {link}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        {/* Global sites */}
        <div className="border-t border-white/10 pt-5 mb-5">
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">HashSpring Global</div>
          <div className="flex flex-wrap gap-2">
            {languageLinks.map((lang) => (
              <Link key={lang.code} href={`/${lang.code}`} className="text-[11px] text-gray-400 no-underline px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                {lang.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 text-center">
          <span className="text-gray-600 text-xs">{dict.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
