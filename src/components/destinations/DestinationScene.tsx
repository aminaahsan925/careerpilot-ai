/**
 * Original hand-drawn inline SVG scenes for destination cards
 * (Round 3, Flashlight / Lens: night geometry, not sunny illustrations).
 *
 * Every shape below is written by hand in code. No copied art, no
 * generated imagery, no characters. The variant is picked
 * deterministically from the destination name so a place always looks
 * like itself. All four variants share one language: a near-black sky,
 * a dot grid of stars, and one lime light.
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

function Stars() {
  return (
    <g fill="var(--cp-paper)" aria-hidden>
      <circle cx="28" cy="20" r="1.6" opacity="0.7" />
      <circle cx="66" cy="12" r="1.2" opacity="0.5" />
      <circle cx="104" cy="24" r="1.6" opacity="0.6" />
      <circle cx="148" cy="12" r="1.2" opacity="0.5" />
      <circle cx="196" cy="22" r="1.6" opacity="0.7" />
      <circle cx="236" cy="12" r="1.2" opacity="0.5" />
      <circle cx="288" cy="26" r="1.6" opacity="0.6" />
    </g>
  );
}

function Moon({ cx = 262, cy = 26, r = 13 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <g aria-hidden>
      <circle cx={cx} cy={cy} r={r + 8} fill="var(--cp-lime)" opacity="0.12" />
      <circle cx={cx} cy={cy} r={r} fill="var(--cp-lime)" opacity="0.9" />
    </g>
  );
}

function Ground({ y = 96 }: { y?: number }) {
  return <line x1="0" y1={y} x2="320" y2={y} stroke="var(--cp-lime)" strokeOpacity="0.4" strokeWidth="1.5" aria-hidden />;
}

function SkylineScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--cp-panel)" />
      <Stars />
      <Moon />
      <Ground />
      <g fill="var(--cp-paper)" opacity="0.1">
        <rect x="18" y="52" width="34" height="44" rx="2" />
        <rect x="60" y="34" width="30" height="62" rx="2" />
        <rect x="98" y="60" width="38" height="36" rx="2" />
        <rect x="196" y="44" width="32" height="52" rx="2" />
        <rect x="236" y="62" width="36" height="34" rx="2" />
      </g>
      <g fill="var(--cp-paper)" opacity="0.16">
        <rect x="144" y="26" width="44" height="70" rx="2" />
        <rect x="280" y="40" width="26" height="56" rx="2" />
      </g>
      {/* Lit windows: the only warm light in the scene. */}
      <g fill="var(--cp-lime)">
        <rect x="26" y="60" width="7" height="7" rx="1" />
        <rect x="38" y="74" width="7" height="7" rx="1" />
        <rect x="68" y="44" width="7" height="7" rx="1" />
        <rect x="68" y="58" width="7" height="7" rx="1" />
        <rect x="106" y="68" width="7" height="7" rx="1" />
        <rect x="152" y="36" width="7" height="7" rx="1" />
        <rect x="164" y="50" width="7" height="7" rx="1" />
        <rect x="204" y="54" width="7" height="7" rx="1" />
        <rect x="244" y="70" width="7" height="7" rx="1" />
        <rect x="286" y="50" width="7" height="7" rx="1" />
      </g>
      <rect x="158" y="14" width="16" height="12" rx="2" fill="var(--cp-ember)" />
      <path d="M0 104 Q 80 100 160 104 T 320 102" stroke="var(--cp-paper)" strokeOpacity="0.3" strokeWidth="2" fill="none" strokeDasharray="8 8" />
    </>
  );
}

function CampusScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--cp-panel)" />
      <Stars />
      <Moon cx={48} cy={26} r={12} />
      <Ground y={96} />
      <rect x="96" y="46" width="128" height="50" rx="4" fill="var(--cp-paper)" opacity="0.08" stroke="var(--cp-paper)" strokeOpacity="0.35" />
      <path d="M88 50 L160 22 L232 50 Z" fill="none" stroke="var(--cp-lime)" strokeOpacity="0.7" strokeWidth="2" strokeLinejoin="round" />
      <rect x="150" y="66" width="20" height="30" rx="3" fill="var(--cp-lime)" opacity="0.85" />
      <g fill="var(--cp-lime)" opacity="0.8">
        <rect x="108" y="56" width="16" height="14" rx="2" />
        <rect x="196" y="56" width="16" height="14" rx="2" />
      </g>
      <g fill="var(--cp-paper)" opacity="0.25">
        <rect x="132" y="56" width="16" height="14" rx="2" />
        <rect x="172" y="56" width="16" height="14" rx="2" />
      </g>
      <rect x="160" y="6" width="3" height="18" fill="var(--cp-paper)" opacity="0.5" />
      <path d="M163 6 h22 l-6 6 6 6 h-22 Z" fill="var(--cp-lime)" />
      <g stroke="var(--cp-paper)" strokeOpacity="0.3" strokeWidth="2">
        <line x1="60" y1="96" x2="60" y2="70" />
        <line x1="262" y1="96" x2="262" y2="70" />
      </g>
      <g fill="none" stroke="var(--cp-lime2)" strokeOpacity="0.6" strokeWidth="2">
        <circle cx="60" cy="62" r="10" />
        <circle cx="262" cy="62" r="10" />
      </g>
    </>
  );
}

function HarbourScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--cp-panel)" />
      <Stars />
      <Moon cx={268} cy={24} r={13} />
      <g stroke="var(--cp-paper)" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M16 84 h288" />
        <path d="M20 96 q10 -4 20 0" />
        <path d="M210 104 q10 -4 20 0" />
        <path d="M250 92 q10 -4 20 0" />
      </g>
      {/* Boat: one hull line, one mast, one lit sail. */}
      <g>
        <path d="M60 80 L200 80 L186 102 L74 102 Z" fill="var(--cp-paper)" opacity="0.1" stroke="var(--cp-paper)" strokeOpacity="0.4" strokeLinejoin="round" />
        <rect x="122" y="36" width="4" height="46" fill="var(--cp-paper)" opacity="0.5" />
        <path d="M129 38 L129 76 L176 76 Z" fill="var(--cp-lime)" opacity="0.85" />
        <path d="M120 44 L120 76 L88 76 Z" fill="var(--cp-paper)" opacity="0.25" />
      </g>
      <g fill="var(--cp-ember)">
        <ellipse cx="238" cy="100" rx="12" ry="4" opacity="0.8" />
        <ellipse cx="262" cy="106" rx="8" ry="3" opacity="0.6" />
      </g>
    </>
  );
}

function HillsScene() {
  return (
    <>
      <rect width="320" height="120" fill="var(--cp-panel)" />
      <Stars />
      <Moon cx={52} cy={26} r={13} />
      <path d="M0 84 Q 70 34 150 72 T 320 60 L320 120 L0 120 Z" fill="var(--cp-paper)" opacity="0.07" />
      <path d="M0 100 Q 90 62 190 94 T 320 88 L320 120 L0 120 Z" fill="var(--cp-paper)" opacity="0.12" />
      <path
        d="M40 120 C 70 104 90 100 120 96 S 190 84 220 70"
        stroke="var(--cp-lime)"
        strokeOpacity="0.7"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      {/* Waypoint marker at the end of the path. */}
      <circle cx="220" cy="70" r="10" fill="none" stroke="var(--cp-lime)" strokeWidth="2" />
      <circle cx="220" cy="70" r="3.5" fill="var(--cp-lime)" />
      <g fill="var(--cp-ember)">
        <circle cx="96" cy="94" r="3" opacity="0.8" />
        <circle cx="150" cy="106" r="3" opacity="0.8" />
        <circle cx="276" cy="100" r="3" opacity="0.8" />
      </g>
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
