import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { checkProofPayment, getBillingStatus, startProofPlanCheckout } from "@/lib/billing.functions";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { MagneticCTA } from "@/components/magnetic-cta";
import "./pricing.css";

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>) => ({
    paid: search["paid"] === "1" ? true : undefined,
    cancelled: search["cancelled"] === "1" ? true : undefined,
    tracker: typeof search["tracker"] === "string" ? (search["tracker"] as string) : undefined,
  }),
  component: PricingPage,
});

function CheckPaymentButton({ tracker }: { tracker: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function handleCheck() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await checkProofPayment({ data: { tracker } });
      setMessage(
        result.activated
          ? "Proof Plan activated! Sign out and back in if your plan still shows Free."
          : `Payment not confirmed yet (status: ${result.state}). Wait a minute and check again.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not check the payment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleCheck}
        disabled={busy}
        className="inline-flex rounded-lg border border-cp-lime/50 px-5 py-3 text-[13.5px] font-semibold text-cp-lime transition-colors hover:bg-cp-lime/10 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Check payment & activate my plan"}
      </button>
      {message ? <p className="mt-3 text-[13.5px]">{message}</p> : null}
    </div>
  );
}

function PayWithSafepayButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  async function handlePay() {
    setBusy(true);
    setError(null);
    try {
      const status = await getBillingStatus();
      setConfigured(status.safepayConfigured);
      if (!status.safepayConfigured) {
        setError(
          "Automatic payments are not open yet. Safepay approval is pending. Pay manually by JazzCash/Easypaisa for now (see below).",
        );
        return;
      }
      const { url } = await startProofPlanCheckout({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <MagneticCTA
        disabled={busy}
        onClick={() => void handlePay()}
        className="inline-flex rounded-lg bg-cp-lime px-5 py-3 text-[13.5px] font-bold text-cp-ink transition-colors hover:bg-cp-lime/90 disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Pay Rs 499 with Safepay →"}
      </MagneticCTA>
      {error ? <p className="mt-3 text-[13px] text-cp-ember">{error}</p> : null}
      {configured === false ? (
        <p className="mt-3 text-[13px] text-cp-stone">
          Manual beta payment (below) is active until Safepay approves the account.
        </p>
      ) : null}
    </div>
  );
}

function PricingPage() {
  const search = Route.useSearch();
  return (
    <div className="min-h-screen bg-cp-ink text-cp-paper">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        {search.paid ? (
          <div className="mb-6 rounded-xl border border-cp-lime/30 bg-cp-lime/10 px-4 py-3 text-[13.5px]">
            <p>
              Payment received. Your Proof Plan activates automatically once Safepay confirms it.
              If it is not active, use the button below to check it directly (no webhook needed).
            </p>
            {search.tracker ? <CheckPaymentButton tracker={search.tracker} /> : null}
          </div>
        ) : null}
        {search.cancelled ? (
          <p className="mb-6 rounded-xl border border-cp-paper/10 bg-cp-panel px-4 py-3 text-[13.5px]">
            Checkout was cancelled. No payment was taken. You can try again below.
          </p>
        ) : null}
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-cp-lime">
          For university students, whatever career you want next
        </p>
        <h1 className="editorial-title mt-4 font-display text-[clamp(2.5rem,6vw,4.25rem)]">
          Pricing
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-[clamp(1.25rem,2.5vw,1.6rem)] italic leading-snug text-cp-stone">
          One free score to prove where you stand. One paid plan for the students who want to
          close the gaps, week by week, with proof.
        </p>
        <div aria-hidden="true" className="mt-8 h-px w-full bg-cp-lime/25" />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="cp-pricing-rise">
            <SpotlightCard className="card-surface flex h-full flex-col p-6 md:p-7">
              <h2 className="font-display text-xl font-bold">Free</h2>
              <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">
                Rs 0
              </p>
              <ul className="mt-5 flex-1 space-y-3 text-[14px] leading-relaxed text-cp-stone">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  One job-readiness score from your resume, projects, and experience, for any target role
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Your top 3 gaps, in plain words
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Up to 10 AI calls per day
                </li>
              </ul>
              <div className="mt-7">
                <MagneticCTA
                  href="/diagnosis"
                  className="inline-flex rounded-lg bg-cp-lime px-5 py-3 text-[13.5px] font-bold text-cp-ink transition-colors hover:bg-cp-lime/90"
                >
                  Start free →
                </MagneticCTA>
              </div>
            </SpotlightCard>
          </div>

          <div className="cp-pricing-rise cp-pricing-rise-1">
            <SpotlightCard className="flex h-full flex-col rounded-2xl border-2 border-cp-lime bg-cp-panel p-6 shadow-[var(--shadow-card)] md:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-bold">Proof Plan</h2>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cp-lime">
                  Paid plan
                </span>
              </div>
              <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">
                Rs 499<span className="text-lg font-bold text-cp-stone">/month</span>
              </p>
              <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-cp-stone">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Everything in Free, plus a full roadmap of proof tasks
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Recruiter-style audit after each proof task
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Weekly proof checks: did you actually build it, or just claim it?
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                  Up to 100 AI calls per day
                </li>
              </ul>
              <PayWithSafepayButton />
              <p className="mt-6 text-[13.5px] leading-relaxed text-cp-stone">
                Until Safepay approves the account, beta payment is manual: pay Rs 499/month by
                JazzCash or Easypaisa, email your payment screenshot to{" "}
                <a
                  href="mailto:ah.systemsss@gmail.com"
                  className="font-semibold text-cp-lime hover:underline"
                >
                  ah.systemsss@gmail.com
                </a>
                , and your Proof Plan is activated by the founder. Once Safepay is live, the Pay
                button above activates it automatically: no screenshot, no waiting.
              </p>
              <Link
                to="/diagnosis"
                className="mt-4 inline-flex self-start rounded-lg border border-cp-lime/50 px-5 py-3 text-[13.5px] font-semibold text-cp-lime transition-colors hover:bg-cp-lime/10"
              >
                Start free, then upgrade →
              </Link>
            </SpotlightCard>
          </div>
        </div>

        <p className="cp-pricing-rise cp-pricing-rise-2 mt-10 text-sm leading-relaxed text-cp-stone">
          Scores and audits are guidance based on the evidence you provide, not a guarantee of an
          interview or a job. See the{" "}
          <Link to="/terms" className="font-semibold text-cp-lime hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-cp-lime hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
