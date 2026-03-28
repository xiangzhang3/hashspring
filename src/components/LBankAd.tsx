/**
 * LBank Advertisement Components
 * Official Partner of Argentina National Team
 * Referral: https://lbank.com/ref/VIPCLUB8
 */

const LBANK_REF_URL = 'https://lbank.com/ref/VIPCLUB8';

/**
 * 300x250 Medium Rectangle Ad — Sidebar / Detail pages
 * LBank x Argentina National Team
 */
export function LBankAd300x250({ label }: { label: string }) {
  return (
    <a
      href={LBANK_REF_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block rounded-lg overflow-hidden relative group no-underline"
      style={{ height: 250 }}
    >
      {/* Ad label */}
      <span className="absolute top-2 right-3 text-[10px] text-white/60 font-medium z-10">{label}</span>

      {/* Background */}
      <div className="w-full h-full relative" style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2847 40%, #1A3A5C 70%, #0A1628 100%)',
      }}>
        {/* Argentina stripe accents */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{
          background: 'linear-gradient(90deg, #75AADB 0%, #FFFFFF 50%, #75AADB 100%)',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{
          background: 'linear-gradient(90deg, #75AADB 0%, #FFFFFF 50%, #75AADB 100%)',
        }} />

        {/* Decorative football pattern */}
        <div className="absolute top-4 right-4 w-16 h-16 opacity-10">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="white" strokeWidth="2" />
            <path d="M32 2 L32 62 M2 32 L62 32 M10 10 L54 54 M54 10 L10 54" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>

        {/* Star accent (World Cup) */}
        <div className="absolute top-6 left-6 opacity-20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-[5] flex flex-col items-center justify-center h-full px-5 text-center">
          {/* LBank Logo Text */}
          <div className="mb-3">
            <span className="text-3xl font-black tracking-tight text-white" style={{ fontFamily: 'system-ui' }}>
              L<span style={{ color: '#3B82F6' }}>Bank</span>
            </span>
          </div>

          {/* Tagline */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-6 bg-white/30" />
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">
              Official Partner
            </span>
            <div className="h-px w-6 bg-white/30" />
          </div>

          {/* Argentina Badge */}
          <div className="flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-lg">🇦🇷</span>
            <span className="text-[12px] font-bold text-white tracking-wide">
              Argentina National Team
            </span>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-bold px-6 py-2 rounded-full transition-all group-hover:shadow-lg group-hover:shadow-blue-500/30">
            Trade Now →
          </div>

          {/* Bottom text */}
          <span className="mt-2 text-[10px] text-white/40">
            lbank.com
          </span>
        </div>
      </div>
    </a>
  );
}

/**
 * In-Feed Banner Ad — Full width x 100px
 * LBank x Argentina National Team (horizontal layout)
 */
export function LBankAdInFeed({ label }: { label: string }) {
  return (
    <div className="py-3">
      <a
        href={LBANK_REF_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block rounded-lg overflow-hidden relative group no-underline"
        style={{ height: 100 }}
      >
        {/* Ad label */}
        <span className="absolute top-1.5 right-2.5 text-[9px] text-white/50 font-semibold z-10">{label}</span>

        {/* Background */}
        <div className="w-full h-full relative" style={{
          background: 'linear-gradient(90deg, #0A1628 0%, #0D2847 30%, #1A3A5C 60%, #0D2847 80%, #0A1628 100%)',
        }}>
          {/* Argentina stripe top */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
            background: 'linear-gradient(90deg, transparent 0%, #75AADB 20%, #FFFFFF 50%, #75AADB 80%, transparent 100%)',
          }} />

          {/* Decorative elements */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-20 opacity-5">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="white" strokeWidth="2" />
              <path d="M32 2 L32 62 M2 32 L62 32" stroke="white" strokeWidth="1" />
            </svg>
          </div>

          {/* Content — horizontal layout, mobile-friendly */}
          <div className="relative z-[5] flex items-center justify-between h-full px-3 sm:px-6">
            {/* Left: Logo + Partner info */}
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white" style={{ fontFamily: 'system-ui' }}>
                L<span style={{ color: '#3B82F6' }}>Bank</span>
              </span>
              <div className="h-8 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">🇦🇷</span>
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-white/60 font-medium uppercase tracking-wider leading-none">
                    Official Partner
                  </span>
                  <span className="text-[11px] sm:text-[13px] font-bold text-white leading-tight">
                    Argentina Team
                  </span>
                </div>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[12px] text-white/70 hidden md:block">
                Trade 800+ Crypto Pairs
              </span>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-[11px] sm:text-xs font-bold px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all group-hover:shadow-lg group-hover:shadow-blue-500/30 whitespace-nowrap">
                Trade Now →
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

/**
 * Compact 300x250 variant — alternate design for second sidebar slot
 * LBank x Argentina (promo focused)
 */
export function LBankAd300x250Alt({ label }: { label: string }) {
  return (
    <a
      href={LBANK_REF_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block rounded-lg overflow-hidden relative group no-underline"
      style={{ height: 250 }}
    >
      {/* Ad label */}
      <span className="absolute top-2 right-3 text-[10px] text-white/60 font-medium z-10">{label}</span>

      {/* Background */}
      <div className="w-full h-full relative" style={{
        background: 'linear-gradient(160deg, #0F2027 0%, #203A43 40%, #2C5364 100%)',
      }}>
        {/* Gold accent top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{
          background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
        }} />

        {/* Stars decoration */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 opacity-30">
          {[...Array(3)].map((_, i) => (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#FFD700">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-[5] flex flex-col items-center justify-center h-full px-5 text-center">
          {/* LBank Logo */}
          <span className="text-3xl font-black tracking-tight text-white mb-2" style={{ fontFamily: 'system-ui' }}>
            L<span style={{ color: '#3B82F6' }}>Bank</span>
          </span>

          {/* Argentina partnership */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-base">🇦🇷</span>
            <span className="text-[11px] font-bold text-white/90">
              Argentina Team Sponsor
            </span>
          </div>

          {/* Promo box */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 mb-4 w-full">
            <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Exclusive Offer</div>
            <div className="text-lg font-black text-white">
              Up to <span className="text-yellow-400">100 USDT</span>
            </div>
            <div className="text-[11px] text-white/70">Welcome Bonus for New Users</div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black text-sm font-bold px-6 py-2 rounded-full transition-all group-hover:shadow-lg group-hover:shadow-yellow-500/30">
            Claim Bonus →
          </div>
        </div>
      </div>
    </a>
  );
}
