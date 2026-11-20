import { Flashlight as FlashlightIcon } from "lucide-react";

import { Flashlight } from "@/components/lens/Flashlight";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import type { CareerUser } from "@/data/user";

/**
 * Profile evidence panel, Round 3 (Cursor as Flashlight / Lens).
 *
 * The signature moment for the profile: a flashlight over the summary.
 * The base layer states what CareerPilot knows about the student; the
 * lit layer reveals the evidence behind each claim, where the fact came
 * from and what it is (or is not). Every claim comes from the real user
 * record; anything missing says "Not set" in the base and "Not set yet"
 * in the lit layer. No invented numbers, no invented percentages.
 *
 * The Flashlight owns the cursor spring, the touch toggle ("Reveal the
 * hidden detail") and the reduced-motion fallback (both layers stacked,
 * fully visible), so no fact is ever cursor-only. The lit layer mirrors
 * the base row-for-row (same pitch, same height), with the evidence in
 * serif italic, so pointing the light at a claim reveals its evidence
 * at the same height.
 */
type Claim = { label: string; value: string; evidence: string };

function profileClaims(user: CareerUser): Claim[] {
  const p = user.profile;
  const education = [user.profile?.degree, user.profile?.university].filter(Boolean).join(", ");
  const skillNames = user.skills.map((s) => s.name);
  const shownSkills = skillNames.slice(0, 3).join(", ");
  const extraSkills = skillNames.length - 3;

  return [
    {
      label: "Role",
      value: user.role || "Not set",
      evidence: p?.current_role
        ? "Saved as your current role in onboarding."
        : user.goal
          ? "Falls back to your target role."
          : "Not set yet. Add it in onboarding.",
    },
    {
      label: "Education",
      value: education || p?.education_level || "Not set",
      evidence: education || p?.education_level
        ? "Saved in onboarding, Education step."
        : "Not set yet. Add it in onboarding.",
    },
    {
      label: "Skills",
      value:
        skillNames.length === 0
          ? "No skills listed"
          : `${skillNames.length} listed: ${shownSkills}${extraSkills > 0 ? ` +${extraSkills} more` : ""}`,
      evidence:
        skillNames.length === 0
          ? "Add skills below or in onboarding."
          : "Student-reported, not test-measured.",
    },
    {
      label: "Target role",
      value: user.goal || "Not set",
      evidence: user.goal
        ? "Your stated target for the roadmap."
        : "Set a target to aim the roadmap.",
    },
    {
      label: "Weekly time",
      value: p?.weekly_hours || "Not set",
      evidence: p?.weekly_hours
        ? "Your stated availability each week."
        : "Not set yet. Add it in onboarding.",
    },
    {
      label: "Biggest concern",
      value: p?.biggest_problem || "Not set",
      evidence: p?.biggest_problem
        ? "Your perception, not our diagnosis."
        : "Not set yet. Add it in onboarding.",
    },
  ];
}

function ClaimRows({ claims }: { claims: Claim[] }) {
  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <div
          key={claim.label}
          className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
        >
          <p className="cp-eyebrow shrink-0">{claim.label}</p>
          <p className="text-right text-[13.5px] leading-snug text-cp-paper">{claim.value}</p>
        </div>
      ))}
    </div>
  );
}

/* The lit layer: one centred line per claim, the SAME row structure and
 * spacing as the base (space-y-3, pb-3, 13.5px text, leading-snug), so
 * the lit layer is the same height as the base and each evidence line
 * sits at the same height as its claim on desktop.
 *
 * Centred, not left-aligned, and label-free, for a geometric reason:
 * the light pool is a circle (radius 140-200px), so at the natural
 * centre cursor position its left edge cuts any text that starts near
 * the panel's left edge, and the chord narrows further on the top and
 * bottom rows. The first version put the evidence after a 118px label
 * column and every line clipped mid-word at rest; on phones the stacked
 * label-above-evidence rows ran taller than the base, so the lit layer
 * misaligned with the claims entirely. Centred lines (the longest is
 * about 280px) sit fully inside the pool at every row. The label is not
 * needed in the lit layer: on desktop each line aligns with its claim
 * row, and the sentences are self-explanatory ("Saved in onboarding,
 * Education step."). On phones the base rows wrap to uneven heights,
 * so row alignment is impossible there; the lit lines stay single-line
 * and in claim order, shorter than the base, so the pool reveals them
 * in sequence as the light is dragged down and the toggle shows them
 * all in full. */
function EvidenceRows({ claims }: { claims: Claim[] }) {
  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <p
          key={claim.label}
          className="border-b border-white/5 pb-3 text-center font-serif text-[13.5px] italic leading-snug text-cp-paper last:border-b-0 last:pb-0"
        >
          {claim.evidence}
        </p>
      ))}
    </div>
  );
}

export function ProfileEvidence({ user }: { user: CareerUser }) {
  const claims = profileClaims(user);
  const reduced = usePrefersReducedMotion();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="cp-eyebrow text-cp-paper">What CareerPilot knows</p>
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cp-stone">
          <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" />
          {reduced ? "The evidence, in full below" : "Shine the light to see the evidence"}
        </p>
      </div>
      <Flashlight lit={<EvidenceRows claims={claims} />}>
        <ClaimRows claims={claims} />
      </Flashlight>
    </div>
  );
}
