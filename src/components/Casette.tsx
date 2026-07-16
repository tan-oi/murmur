export function Cassette({
  isPlaying = false,
  label = "1",
  title = "field note",
  size = 48,
}: {
  isPlaying?: boolean;
  label?: string;
  title?: string;
  size?: number;
}) {
  const shellTop = isPlaying ? "#912525" : "#5A3A26";
  const shellBot = isPlaying ? "#5A1414" : "#3E2818";
  const shellDark = isPlaying ? "#4A0F0F" : "#2A1B10";
  const reelAnim = isPlaying ? "reel 0.85s linear infinite" : "none";

  // unique gradient ids so multiple cassettes on one page don't clash
  const uid = `${isPlaying ? "p" : "i"}${label}`;
  const shellGrad = `shell-${uid}`;
  const reelGrad = `reel-${uid}`;

  return (
    <svg
      width={size}
      height={size * (66 / 80)}
      viewBox="0 0 80 66"
      style={{ cursor: "pointer", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={shellGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shellTop} />
          <stop offset="1" stopColor={shellBot} />
        </linearGradient>
        <radialGradient id={reelGrad} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#3A2418" />
          <stop offset="1" stopColor="#160A04" />
        </radialGradient>
      </defs>

      {/* ground shadow at tail tip */}
      <ellipse cx="40" cy="62" rx="12" ry="2.5" fill="#3A2A1C" opacity="0.2" />

      {/* pointer tail */}
      <path d="M40 60 L33 48 L47 48 Z" fill={`url(#${shellGrad})`} />
      <path
        d="M40 60 L33 48 L47 48 Z"
        fill="none"
        stroke={shellDark}
        strokeWidth="1.5"
      />

      {/* shell with gradient */}
      <rect
        x="4"
        y="4"
        width="72"
        height="46"
        rx="6"
        fill={`url(#${shellGrad})`}
      />
      <rect
        x="4"
        y="4"
        width="72"
        height="46"
        rx="6"
        fill="none"
        stroke={shellDark}
        strokeWidth="1.5"
      />
      {/* top sheen */}
      <rect
        x="7"
        y="6"
        width="66"
        height="12"
        rx="4"
        fill="#FFFFFF"
        opacity="0.12"
      />

      {/* label strip */}
      <rect x="12" y="8" width="56" height="16" rx="2" fill="#F1EAD8" />
      <rect
        x="12"
        y="8"
        width="56"
        height="4.5"
        rx="2"
        fill={shellBot}
        opacity="0.9"
      />
      <text
        x="15"
        y="12"
        fontSize="3.5"
        fill="#F1EAD8"
        fontFamily="monospace"
        letterSpacing="0.5"
      >
        ● SIDE A
      </text>
      <text
        x="65"
        y="12"
        fontSize="3.5"
        fill="#F1EAD8"
        fontFamily="monospace"
        textAnchor="end"
      >
        {label}
      </text>

      {/* handwritten title OR singing waveform */}
      {isPlaying ? (
        <path
          d="M16 20 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0"
          stroke={shellBot}
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            values="M16 20 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0;M16 20 q3 2.5 6 0 t6 0 t6 0 t6 0 t6 0;M16 20 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </path>
      ) : (
        <text
          x="40"
          y="21"
          textAnchor="middle"
          fontSize="7"
          fill="#3A2A1C"
          fontFamily="'Caveat', cursive"
        >
          {title}
        </text>
      )}

      {/* window */}
      <rect x="16" y="28" width="48" height="18" rx="3" fill={shellDark} />
      <rect
        x="22"
        y="30"
        width="36"
        height="14"
        rx="2"
        fill="#241009"
        opacity="0.55"
      />

      {/* left reel — layered tape (fuller) */}
      <g style={{ transformOrigin: "28px 37px", animation: reelAnim }}>
        <circle cx="28" cy="37" r="8" fill={`url(#${reelGrad})`} />
        <circle
          cx="28"
          cy="37"
          r="8"
          fill="none"
          stroke="#8B6A4A"
          strokeWidth="4"
          opacity="0.9"
        />
        <circle
          cx="30"
          cy="37"
          r="6.5"
          fill="none"
          stroke="#C9A67A"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <g stroke="#E8D4B0" strokeWidth="1.3" strokeLinecap="round">
          <line x1="28" y1="37" x2="28" y2="30.5" />
          <line x1="28" y1="37" x2="33.6" y2="40.2" />
          <line x1="28" y1="37" x2="22.4" y2="40.2" />
        </g>
        <circle cx="30" cy="37" r="2" fill="#F1EAD8" />
      </g>

      {/* right reel — layered tape (emptier) */}
      <g style={{ transformOrigin: "52px 37px", animation: reelAnim }}>
        <circle cx="50" cy="37" r="8" fill={`url(#${reelGrad})`} />
        <circle
          cx="52"
          cy="37"
          r="8"
          fill="none"
          stroke="#8B6A4A"
          strokeWidth="1.8"
          opacity="0.9"
        />
        <circle
          cx="50"
          cy="37"
          r="6.5"
          fill="none"
          stroke="#C9A67A"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <g stroke="#E8D4B0" strokeWidth="1.3" strokeLinecap="round">
          <line x1="52" y1="37" x2="52" y2="30.5" />
          <line x1="52" y1="37" x2="57.6" y2="40.2" />
          <line x1="52" y1="37" x2="46.4" y2="40.2" />
        </g>
        <circle cx="50" cy="37" r="2" fill="#F1EAD8" />
      </g>

      {/* tape span */}
      <path d="M36 37 h8" stroke="#4A3020" strokeWidth="4" opacity="0.85" />

      {/* screws */}
      <circle cx="11" cy="46" r="1.4" fill={shellDark} />
      <circle cx="69" cy="46" r="1.4" fill={shellDark} />
    </svg>
  );
}
