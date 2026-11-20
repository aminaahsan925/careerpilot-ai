import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { HeroLens } from "@/components/landing/HeroLens";
import { BelowHero } from "@/components/landing/BelowHero";

/**
 * Landing page composition (Round 3, Direction 2, Cursor as
 * Flashlight / Lens).
 *
 * This file owns page composition only: the header, the hero
 * (HeroLens, worker 1), and everything below the hero (BelowHero,
 * worker 2), which includes the footer CTA and the footer itself.
 * Do not add a second footer here.
 *
 * Header anchor links match the section ids BelowHero actually
 * renders (#pillars, #how, #market).
 * Colours and fonts use the Round 3 tokens from styles.css (worker 2)
 * with fallbacks matching the token contract exactly.
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI: Get Hired on Evidence" },
      {
        name: "description",
        content:
          "CareerPilot AI analyzes your resume, simulates Recruiter Audits, maps Market Reality & Future Tech trends, and turns your gaps into a day-by-day roadmap.",
      },
      { property: "og:title", content: "CareerPilot AI: Get Hired on Evidence" },
      {
        property: "og:description",
        content:
          "Career Intelligence Platform: Recruiter Audit, Market Reality, Roadmap & AI Mentorship.",
      },
    ],
  }),
  component: Landing,
});

const NAV_LINKS = [
  { label: "Pillars", href: "#pillars" },
  { label: "How it works", href: "#how" },
  { label: "Market Mirror", href: "#market" },
];

const MONO_FONT =
  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

function Landing() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Some Supabase email templates redirect to the site root. Preserve the
    // recovery token and move the user to the password form immediately.
    if (window.location.hash.includes("type=recovery")) {
      void navigate({ to: "/auth", search: { reset: true, redirect: undefined } });
    }
  }, [navigate]);

  return (
    <div
      className="min-h-screen scroll-smooth"
      style={{
        background: "var(--cp-ink, #040403)",
        color: "var(--cp-paper, #f4f1ea)",
        fontFamily: "var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)",
      }}
    >
      {/* HEADER */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[3px]"
            style={{ background: "var(--cp-lime, #e1f10d)" }}
          />
          <span
            className="text-[15px] font-extrabold tracking-[0.14em]"
            style={{
              fontFamily:
                "var(--font-display, 'Archivo', 'Plus Jakarta Sans', system-ui, sans-serif)",
            }}
          >
            CAREERPILOT
          </span>
          <span
            className="text-[12px] font-bold tracking-[0.16em]"
            style={{
              fontFamily: MONO_FONT,
              color: "var(--cp-lime, #e1f10d)",
            }}
          >
            AI
          </span>
        </div>
        <nav className="hidden items-center gap-7 text-[13px] font-medium lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-[var(--cp-paper,#f4f1ea)]"
              style={{ color: "var(--cp-stone, #c6c5bf)" }}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/diagnosis"
            className="transition hover:text-[var(--cp-paper,#f4f1ea)]"
            style={{ color: "var(--cp-stone, #c6c5bf)" }}
          >
            Diagnosis
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            search={{ redirect: undefined, reset: undefined }}
            className="hidden text-[13px] font-semibold transition hover:text-[var(--cp-paper,#f4f1ea)] sm:block"
            style={{ color: "var(--cp-stone, #c6c5bf)" }}
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="whitespace-nowrap rounded-full bg-[var(--cp-lime,#e1f10d)] px-4 py-2.5 text-[13px] font-bold text-[var(--cp-ink,#040403)] transition-transform hover:-translate-y-0.5"
          >
            Open Dashboard
          </Link>
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
            className="rounded-full p-2.5 lg:hidden"
            style={{
              border: "1px solid rgba(198, 197, 191, 0.25)",
              color: "var(--cp-paper, #f4f1ea)",
            }}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV: the desktop nav is hidden below lg, so phones get this panel. */}
      {mobileNavOpen && (
        <nav aria-label="Mobile" className="mx-auto max-w-6xl px-6 pb-2 lg:hidden">
          <div
            className="flex flex-col gap-1 rounded-2xl p-3 text-[14px] font-medium"
            style={{
              background: "rgba(244, 241, 234, 0.06)",
              border: "1px solid rgba(198, 197, 191, 0.16)",
              color: "var(--cp-stone, #c6c5bf)",
            }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-3 py-2.5 transition hover:bg-[rgba(244,241,234,0.08)] hover:text-[var(--cp-paper,#f4f1ea)]"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/diagnosis"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-[rgba(244,241,234,0.08)] hover:text-[var(--cp-paper,#f4f1ea)]"
            >
              Diagnosis
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined, reset: undefined }}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 font-semibold transition hover:bg-[rgba(244,241,234,0.08)] hover:text-[var(--cp-paper,#f4f1ea)] sm:hidden"
              style={{
                borderTop: "1px solid rgba(198, 197, 191, 0.16)",
                color: "var(--cp-paper, #f4f1ea)",
              }}
            >
              Sign in
            </Link>
          </div>
        </nav>
      )}

      <main>
        <HeroLens />
        <BelowHero />
      </main>
    </div>
  );
}
