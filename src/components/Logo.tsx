// HashSpring Circle Logo (V1 style)
export function LogoIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[#0066FF] to-[#6366F1] flex items-center justify-center font-black text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      H
    </div>
  );
}

// "HS" badge for author avatar
export function LogoBadge({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] flex items-center justify-center font-bold text-[#0066FF] border-2 border-[#0066FF]/30"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      HS
    </div>
  );
}

// Full header lockup: circle icon + HashSpring + tagline
export function LogoFull({ size = 36 }: { size?: number }) {
  return (
    <a href="/" className="flex items-center gap-3 no-underline">
      <LogoIcon size={size} />
      <div className="flex flex-col">
        <span className="text-lg font-extrabold text-white tracking-tight leading-none">
          HashSpring
        </span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Global Crypto Intelligence
        </span>
      </div>
    </a>
  );
}
