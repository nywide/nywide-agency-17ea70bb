export function NLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="nGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#E5A500" />
          </linearGradient>
          <filter id="nShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#FFB800" floodOpacity="0.3"/>
          </filter>
        </defs>
        <circle cx="24" cy="24" r="22" fill="rgba(0, 0, 0, 0.8)" stroke="url(#nGoldGradient)" strokeWidth="1.5" />
        <g filter="url(#nShadow)">
          <path d="M14 34V14L14.5 14L18 14V30.5L14 34Z" fill="url(#nGoldGradient)" />
          <path d="M30 14V34L34 34V14H30Z" fill="url(#nGoldGradient)" />
          <path d="M14 14L18 14L34 30V34L30 34L14 18V14Z" fill="url(#nGoldGradient)" />
          <path d="M22 20L26 24L24 26L20 22L22 20Z" fill="rgba(0, 0, 0, 0.3)" />
        </g>
        <rect x="14" y="36" width="20" height="2" rx="1" fill="url(#nGoldGradient)" opacity="0.6" />
      </svg>
    </div>
  );
}
