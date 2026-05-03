import type { SVGProps } from "react";

export function RinMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label="Rin mascot" {...props}>
      <defs>
        <linearGradient id="rinHair" x1="30" x2="128" y1="18" y2="120">
          <stop stopColor="#FFD3DC" />
          <stop offset="1" stopColor="#C5B4E3" />
        </linearGradient>
        <linearGradient id="rinBadge" x1="0" x2="1">
          <stop stopColor="#A8D8EA" />
          <stop offset="1" stopColor="#B9E8D5" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="70" fill="#FDFBF7" />
      <path
        d="M35 72c0-33 20-53 48-53 29 0 47 20 47 53 0 21-9 42-24 53H59C44 114 35 93 35 72z"
        fill="url(#rinHair)"
      />
      <path d="M51 83c0-22 13-37 32-37s32 15 32 37-14 39-32 39-32-17-32-39z" fill="#FFEFEF" />
      <circle cx="67" cy="83" r="6" fill="#4A96D8" />
      <circle cx="99" cy="83" r="6" fill="#4A96D8" />
      <path d="M75 101c5 4 11 4 16 0" fill="none" stroke="#6A4E68" strokeLinecap="round" strokeWidth="4" />
      <path d="M50 66c12-8 29-10 63-5" fill="none" stroke="#EAA4B4" strokeLinecap="round" strokeWidth="9" />
      <rect x="62" y="116" width="42" height="24" rx="12" fill="url(#rinBadge)" />
      <text x="83" y="133" fill="#1A1530" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" textAnchor="middle">
        AC
      </text>
    </svg>
  );
}
