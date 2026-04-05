'use client'

// Orbiting avatar network animation — pure CSS, no JS animation libraries
// Each avatar orbits the center chart icon.
// Respects prefers-reduced-motion.

const AVATARS = [
  { initials: 'WB', badge: 'buy',  delay: '0s' },
  { initials: 'BA', badge: 'sell', delay: '0.6s' },
  { initials: 'MK', badge: 'buy',  delay: '1.2s' },
  { initials: 'SB', badge: 'buy',  delay: '1.8s' },
  { initials: 'DC', badge: 'sell', delay: '2.4s' },
  { initials: 'TT', badge: 'buy',  delay: '3.0s' },
  { initials: 'DT', badge: 'sell', delay: '3.6s' },
  { initials: 'RD', badge: 'buy',  delay: '4.2s' },
]

const N = AVATARS.length
const CX = 160
const CY = 160
const R = 108

// Pre-compute static avatar positions (angle = index * 360/N)
const positions = AVATARS.map((_, i) => {
  const angle = (i / N) * 2 * Math.PI - Math.PI / 2
  return {
    x: CX + R * Math.cos(angle),
    y: CY + R * Math.sin(angle),
    angle: (i / N) * 360,
  }
})

export function NetworkAnimation() {
  return (
    <>
      <style>{`
        @keyframes network-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes network-counter {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes network-badge-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%       { transform: scale(1.22); opacity: 1; }
        }
        @keyframes network-line-fade {
          0%, 100% { opacity: 0.06; }
          50%       { opacity: 0.22; }
        }
        @keyframes network-center-glow {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.28; }
        }
        @media (prefers-reduced-motion: reduce) {
          .na-orbit   { animation: none !important; }
          .na-counter { animation: none !important; }
          .na-badge   { animation: none !important; }
          .na-line    { animation: none !important; }
          .na-glow    { animation: none !important; }
        }
      `}</style>

      <div className="relative w-80 h-80 mx-auto select-none" aria-hidden="true">
        {/* Static SVG layer: ring path + connecting lines */}
        <svg
          viewBox="0 0 320 320"
          className="absolute inset-0 w-full h-full"
        >
          {/* Orbit ring */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="rgba(139,92,246,0.10)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* Connecting lines — fade animation staggered */}
          {positions.map((pos, i) => (
            <line
              key={`line-${i}`}
              className="na-line"
              x1={CX} y1={CY}
              x2={pos.x} y2={pos.y}
              stroke="rgba(139,92,246,0.18)"
              strokeWidth="1"
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                animation: `network-line-fade ${3 + i * 0.4}s ease-in-out infinite`,
                animationDelay: AVATARS[i].delay,
              }}
            />
          ))}

          {/* Center glow ring */}
          <circle
            className="na-glow"
            cx={CX} cy={CY} r={38}
            fill="rgba(139,92,246,0.12)"
            stroke="rgba(139,92,246,0.25)"
            strokeWidth="1"
            style={{ animation: 'network-center-glow 3s ease-in-out infinite' }}
          />

          {/* Center chart icon */}
          <g opacity="0.85">
            <rect x={CX - 16} y={CY - 2}  width={6} height={14} rx={1.5} fill="rgba(139,92,246,0.7)" />
            <rect x={CX - 8}  y={CY - 10} width={6} height={22} rx={1.5} fill="rgba(139,92,246,0.85)" />
            <rect x={CX}      y={CY - 6}  width={6} height={18} rx={1.5} fill="rgba(139,92,246,0.75)" />
            <rect x={CX + 8}  y={CY - 14} width={6} height={26} rx={1.5} fill="rgba(139,92,246,0.9)" />
            {/* baseline */}
            <line x1={CX - 19} y1={CY + 14} x2={CX + 18} y2={CY + 14} stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
          </g>
        </svg>

        {/* Orbiting ring — one div rotates, each avatar counter-rotates */}
        <div
          className="na-orbit absolute inset-0"
          style={{
            animation: 'network-orbit 38s linear infinite',
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          {positions.map((pos, i) => {
            const avatar = AVATARS[i]
            const isBuy = avatar.badge === 'buy'
            return (
              <div
                key={`avatar-${i}`}
                className="na-counter absolute"
                style={{
                  left: pos.x - 18,
                  top: pos.y - 18,
                  width: 36,
                  height: 36,
                  animation: 'network-counter 38s linear infinite',
                  transformOrigin: '18px 18px',
                }}
              >
                {/* Avatar circle */}
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
                  style={{
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {avatar.initials}
                </div>

                {/* Buy/sell badge */}
                <div
                  className="na-badge absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: isBuy ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)',
                    color: '#fff',
                    animation: `network-badge-pulse ${2.2 + i * 0.28}s ease-in-out infinite`,
                    animationDelay: avatar.delay,
                  }}
                >
                  {isBuy ? '▲' : '▼'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
