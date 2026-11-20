/**
 * Original hand-drawn inline SVG scenes for destination cards
 * (Direction 3, Santorini pattern: the dashboard as a map of places).
 *
 * Every shape below is written by hand in code. No copied art, no
 * generated imagery. The variant is picked deterministically from the
 * destination name so a place always looks like itself.
 */

export type SceneVariant = "skyline" | "campus" | "harbour" | "hills";

const VARIANTS: SceneVariant[] = ["skyline", "campus", "harbour", "hills"];

export function sceneVariantFor(name: string): SceneVariant {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return VARIANTS[Math.abs(hash) % VARIANTS.length] ?? "skyline";
}

function Sun({ cx = 262, cy = 26, r = 16 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <g aria-hidden>
      <circle cx={cx} cy={cy} r={r + 7} fill="var(--d3-mustard)" opacity="0.35" />
      <circle cx={cx} cy={cy} r={r} fill="var(--d3-mustard)" />
    </g>
  );
}

function Clouds() {
  return (
    <g fill="#ffffff" opacity="0.85" aria-hidden>
      <ellipse cx="52" cy="26" rx="26" ry="9" />
      <ellipse cx="70" cy="20" rx="18" ry="8" />
      <ellipse cx="180" cy="16" rx="20" ry="7" />
    </g>
  );
}

function Birds() {
  return (
    <g
      stroke="var(--d3-choco)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      aria-hidden
    >
      <path d="M120 30 q6 -6 12 0 q6 -6 12 0" />
      <path d="M152 42 q5 -5 10 0 q5 -5 10 0" />
    </g>
  );
}

function SkylineScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--d3-sky)" />
      <Sun />
      <Clouds />
      <rect x="0" y="96" width="320" height="24" fill="var(--d3-leaf)" />
      <g fill="var(--d3-navy)">
        <rect x="18" y="52" width="34" height="44" rx="3" />
        <rect x="60" y="34" width="30" height="62" rx="3" />
        <rect x="98" y="60" width="38" height="36" rx="3" />
        <rect x="196" y="44" width="32" height="52" rx="3" />
        <rect x="236" y="62" width="36" height="34" rx="3" />
      </g>
      <g fill="var(--d3-peri)">
        <rect x="144" y="26" width="44" height="70" rx="3" />
        <rect x="280" y="40" width="26" height="56" rx="3" />
      </g>
      <g fill="var(--d3-mustard)">
        <rect x="26" y="60" width="7" height="7" rx="1" />
        <rect x="38" y="60" width="7" height="7" rx="1" />
        <rect x="26" y="74" width="7" height="7" rx="1" />
        <rect x="68" y="44" width="7" height="7" rx="1" />
        <rect x="68" y="58" width="7" height="7" rx="1" />
        <rect x="106" y="68" width="7" height="7" rx="1" />
        <rect x="152" y="36" width="7" height="7" rx="1" />
        <rect x="164" y="36" width="7" height="7" rx="1" />
        <rect x="152" y="50" width="7" height="7" rx="1" />
        <rect x="204" y="54" width="7" height="7" rx="1" />
        <rect x="244" y="70" width="7" height="7" rx="1" />
        <rect x="286" y="50" width="7" height="7" rx="1" />
      </g>
      <rect x="158" y="14" width="16" height="12" rx="2" fill="var(--d3-flame)" />
      <path d="M0 104 Q 80 96 160 104 T 320 102" stroke="#ffffff" strokeWidth="3" fill="none" strokeDasharray="8 8" opacity="0.7" />
    </>
  );
}

function CampusScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--d3-sky)" />
      <Sun cx={48} cy={26} r={14} />
      <Clouds />
      <Birds />
      <rect x="0" y="92" width="320" height="28" fill="var(--d3-lime)" />
      <rect x="96" y="46" width="128" height="50" rx="4" fill="var(--d3-paper)" />
      <path d="M88 50 L160 22 L232 50 Z" fill="var(--d3-flame)" />
      <rect x="150" y="66" width="20" height="30" rx="3" fill="var(--d3-choco)" />
      <g fill="var(--d3-navy)">
        <rect x="108" y="56" width="16" height="14" rx="2" />
        <rect x="132" y="56" width="16" height="14" rx="2" />
        <rect x="172" y="56" width="16" height="14" rx="2" />
        <rect x="196" y="56" width="16" height="14" rx="2" />
      </g>
      <rect x="160" y="6" width="3" height="18" fill="var(--d3-choco)" />
      <path d="M163 6 h22 l-6 6 6 6 h-22 Z" fill="var(--d3-mustard)" />
      <g>
        <rect x="56" y="66" width="8" height="30" fill="var(--d3-choco)" />
        <circle cx="60" cy="58" r="18" fill="var(--d3-leaf)" />
        <circle cx="48" cy="66" r="11" fill="var(--d3-leaf)" />
        <rect x="258" y="66" width="8" height="30" fill="var(--d3-choco)" />
        <circle cx="262" cy="58" r="18" fill="var(--d3-leaf)" />
        <circle cx="274" cy="66" r="11" fill="var(--d3-leaf)" />
      </g>
      <path d="M150 120 C 152 108 158 102 160 96" stroke="var(--d3-mustard)" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  );
}

function HarbourScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--d3-sky)" />
      <Sun cx={268} cy={24} r={15} />
      <Clouds />
      <Birds />
      <rect x="0" y="78" width="320" height="42" fill="var(--d3-teal)" />
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.8" fill="none">
        <path d="M20 92 q10 -5 20 0" />
        <path d="M210 100 q10 -5 20 0" />
        <path d="M250 88 q10 -5 20 0" />
      </g>
      <g>
        <path d="M60 78 L200 78 L186 100 L74 100 Z" fill="var(--d3-flame)" />
        <rect x="122" y="34" width="5" height="46" fill="var(--d3-choco)" />
        <path d="M129 36 L129 74 L176 74 Z" fill="var(--d3-paper)" />
        <path d="M120 42 L120 74 L88 74 Z" fill="var(--d3-mustard)" />
      </g>
      <g fill="var(--d3-gold)">
        <ellipse cx="238" cy="98" rx="14" ry="5" />
        <ellipse cx="262" cy="104" rx="10" ry="4" />
      </g>
      <circle cx="238" cy="96" r="3" fill="var(--d3-choco)" />
    </>
  );
}

function HillsScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--d3-sky)" />
      <Sun cx={52} cy={26} r={15} />
      <Clouds />
      <path d="M0 84 Q 70 34 150 72 T 320 60 L320 120 L0 120 Z" fill="var(--d3-leaf)" />
      <path d="M0 100 Q 90 62 190 94 T 320 88 L320 120 L0 120 Z" fill="var(--d3-lime)" />
      <path
        d="M40 120 C 70 104 90 100 120 96 S 190 84 220 70"
        stroke="var(--d3-paper)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 12"
      />
      <g>
        <rect x="216" y="52" width="8" height="22" fill="var(--d3-choco)" />
        <circle cx="220" cy="44" r="16" fill="var(--d3-navy)" />
        <circle cx="208" cy="52" r="10" fill="var(--d3-navy)" />
      </g>
      <g fill="var(--d3-flame)">
        <circle cx="96" cy="92" r="5" />
        <circle cx="150" cy="104" r="5" />
        <circle cx="276" cy="98" r="5" />
      </g>
      <g fill="var(--d3-mustard)">
        <circle cx="112" cy="98" r="4" />
        <circle cx="250" cy="108" r="4" />
      </g>
      <path d="M236 34 l14 8 -14 8 Z" fill="var(--d3-paper)" transform="rotate(12 243 42)" />
    </>
  );
}

const SCENES: Record<SceneVariant, () => React.ReactNode> = {
  skyline: SkylineScene,
  campus: CampusScene,
  harbour: HarbourScene,
  hills: HillsScene,
};

export function DestinationScene({
  name,
  variant,
  className,
}: {
  name: string;
  variant?: SceneVariant;
  className?: string;
}) {
  const picked = variant ?? sceneVariantFor(name);
  const Scene = SCENES[picked];
  return (
    <svg
      viewBox="0 0 320 120"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`Illustrated scene for ${name}`}
    >
      <Scene />
    </svg>
  );
}
