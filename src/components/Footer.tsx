import { LogoIcon } from './Logo';
import type { Dictionary } from '@/lib/i18n';

const sites = ['🇺🇸 EN', '🇨🇳 中文', '🇯🇵 日本語', '🇰🇷 한국어', '🇪🇸 ES', '🇧🇷 PT', '🇫🇷 FR', '🇩🇪 DE', '🇷🇺 RU'];

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="bg-[#1a1a2e] pt-10 pb-6 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-8">
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
              {['X', 'Telegram', 'Discord', 'LinkedIn'].map((s) => (
                <a key={s} href="#" className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-gray-400 text-[10px] font-bold no-underline hover:bg-white/15">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {dict.footerLinks.map((group, gi) => (
            <div key={gi}>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-3.5">
                {group[0]}
              </div>
              {group.slice(1).map((link) => (
                <a key={link} href="#" className="block text-gray-500 text-[13px] no-underline mb-2.5 hover:text-gray-300">
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Global sites */}
        <div className="border-t border-white/10 pt-5 mb-5">
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">HashSpring Global</div>
          <div className="flex flex-wrap gap-2">
            {sites.map((s) => (
              <a key={s} href="#" className="text-[11px] text-gray-400 no-underline px-2 py-1 rounded bg-white/5 hover:bg-white/10">
                {s}
              </a>
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
