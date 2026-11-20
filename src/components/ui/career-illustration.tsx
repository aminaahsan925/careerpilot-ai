import { motion } from "motion/react";

interface CareerIllustrationProps {
  className?: string;
  badgeText?: string;
}

export function CareerIllustration({ className = "", badgeText = "your employability." }: CareerIllustrationProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center p-4 ${className}`}>
      {/* Optional Top Tagline */}
      {badgeText && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center font-display text-lg font-bold tracking-tight text-foreground/80 sm:text-xl"
        >
          {badgeText}
        </motion.p>
      )}

      {/* Vector Illustration Canvas */}
      <div className="relative w-full max-w-[420px] aspect-[4/3] flex items-center justify-center">
        {/* Floating Bar Chart Card (Left Background) */}
        <motion.div
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 0.6 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute left-2 top-8 z-0 flex items-end gap-1.5 rounded-2xl border border-amber-900/10 bg-[#F5F0E6]/90 p-3 shadow-md backdrop-blur-xs sm:left-4"
        >
          <div className="h-6 w-2.5 rounded-xs bg-[#ea580c]/30" />
          <div className="h-10 w-2.5 rounded-xs bg-[#ea580c]/60" />
          <div className="h-14 w-2.5 rounded-xs bg-[#ea580c]" />
          <div className="h-12 w-2.5 rounded-xs bg-[#d97706]" />
        </motion.div>

        {/* Floating Donut Chart (Right Background) */}
        <motion.div
          initial={{ opacity: 0, x: 20, y: -10 }}
          animate={{ opacity: 1, x: 0, y: [0, 6, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.2 },
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          }}
          className="absolute right-4 top-4 z-0 h-16 w-16 sm:h-20 sm:w-20"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
            {/* Background Donut */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#EFEAD8" strokeWidth="18" />
            {/* Segment 1: Terracotta */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#ea580c"
              strokeWidth="18"
              strokeDasharray="140 100"
              strokeDashoffset="20"
            />
            {/* Segment 2: Clay/Orange */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#f97316"
              strokeWidth="18"
              strokeDasharray="70 170"
              strokeDashoffset="-120"
            />
          </svg>
        </motion.div>

        {/* Plant (Far Right) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="absolute right-2 bottom-6 z-0 flex flex-col items-center"
        >
          {/* Leaves */}
          <div className="flex gap-1 mb-[-4px]">
            <div className="h-10 w-4 rounded-full bg-[#E5DEC9] rotate-[-25deg] shadow-xs" />
            <div className="h-12 w-4 rounded-full bg-[#D8CEB3] rotate-[5deg] shadow-xs" />
            <div className="h-10 w-4 rounded-full bg-[#E5DEC9] rotate-[30deg] shadow-xs" />
          </div>
          {/* Pot */}
          <div className="h-9 w-8 rounded-b-lg bg-[#121214] shadow-md" />
        </motion.div>

        {/* Central Character & Laptop SVG */}
        <svg viewBox="0 0 340 260" className="relative z-10 w-full h-full">
          {/* Desk Base Line */}
          <line x1="20" y1="230" x2="320" y2="230" stroke="#121214" strokeWidth="2.5" strokeLinecap="round" />

          {/* Torso / Sweaters (Warm Terracotta #ea580c) */}
          <path
            d="M 130 180 C 130 150, 160 145, 185 145 C 220 145, 235 155, 240 210 L 125 210 Z"
            fill="#ea580c"
          />

          {/* Arms & Hands on Laptop */}
          <path
            d="M 140 185 Q 165 205, 180 210"
            fill="none"
            stroke="#d97706"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 180 205 Q 200 208, 220 210"
            fill="none"
            stroke="#ea580c"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Hand */}
          <circle cx="170" cy="208" r="7" fill="#FADCB9" />
          <circle cx="185" cy="208" r="7" fill="#FADCB9" />

          {/* Neck */}
          <rect x="176" y="125" width="14" height="25" fill="#FADCB9" rx="4" />

          {/* Head & Face */}
          <ellipse cx="183" cy="105" rx="20" ry="24" fill="#FADCB9" />

          {/* Facial Features */}
          {/* Eye */}
          <ellipse cx="176" cy="102" rx="2.5" ry="3.5" fill="#121214" />
          {/* Eyebrow */}
          <path d="M 172 95 Q 177 93, 181 95" stroke="#121214" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Smile */}
          <path d="M 170 114 Q 176 120, 182 114" stroke="#121214" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Nose */}
          <path d="M 171 106 Q 168 110, 172 110" stroke="#E2B895" strokeWidth="2" fill="none" />

          {/* Lush Black Hair (#121214) */}
          <path
            d="M 160 100 C 150 70, 205 65, 208 95 C 215 120, 210 170, 212 195 C 198 190, 195 150, 195 130 C 190 100, 160 110, 160 100 Z"
            fill="#121214"
          />
          <path
            d="M 165 92 Q 180 80, 195 90 C 185 85, 170 85, 165 92 Z"
            fill="#121214"
          />

          {/* Sleek Laptop (#121214) */}
          {/* Screen Body */}
          <path
            d="M 60 150 L 155 150 L 155 220 L 60 220 Z"
            fill="#121214"
            rx="6"
          />
          {/* Laptop Base keyboard deck */}
          <path
            d="M 25 224 L 165 224 L 160 230 L 30 230 Z"
            fill="#121214"
          />
          {/* Glowing 4-Point Star Emblem on Laptop Cover */}
          <g transform="translate(107, 185)">
            <path
              d="M 0 -10 Q 0 0, 10 0 Q 0 0, 0 10 Q 0 0, -10 0 Q 0 0, 0 -10 Z"
              fill="#FAF7F2"
            />
          </g>
        </svg>

        {/* Ambient Glow behind Laptop */}
        <div className="pointer-events-none absolute left-20 bottom-10 h-24 w-24 rounded-full bg-[#ea580c]/20 blur-xl" />
      </div>
    </div>
  );
}
