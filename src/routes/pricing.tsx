import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { checkProofPayment, getBillingStatus, startProofPlanCheckout } from "@/lib/billing.functions";

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
        className="inline-flex rounded-lg border border-terracotta px-5 py-3 text-[13.5px] font-semibold text-terracotta disabled:opacity-60"
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
          "Automatic payments are not open yet — Safepay approval is pending. Pay manually by JazzCash/Easypaisa for now (see below).",
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
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="inline-flex rounded-lg bg-terracotta px-5 py-3 text-[13.5px] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Pay Rs 499 with Safepay →"}
      </button>
      {error ? <p className="mt-3 text-[13px] text-terracotta">{error}</p> : null}
      {configured === false ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Manual beta payment (below) is active until Safepay approves the account.
        </p>
      ) : null}
    </div>
  );
}

function PricingPage() {
  const search = Route.useSearch();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {search.paid ? (
        <div className="mb-6 rounded-xl border border-border bg-secondary px-4 py-3 text-[13.5px]">
          <p>
            Payment received — your Proof Plan activates automatically once Safepay confirms it.
            If it is not active, use the button below to check it directly (no webhook needed).
          </p>
          {search.tracker ? <CheckPaymentButton tracker={search.tracker} /> : null}
        </div>
      ) : null}
      {search.cancelled ? (
        <p className="mb-6 rounded-xl border border-border bg-secondary px-4 py-3 text-[13.5px]">
          Checkout was cancelled — no payment was taken. You can try again below.
        </p>
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
        For university students, whatever career you want next
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        One free score to prove where you stand. One paid plan for the students who want to
        close the gaps, week by week, with proof.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border p-6">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-1 text-2xl font-bold">Rs 0</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed">
            <li>One job-readiness score from your resume, projects, and experience — for any target role</li>
            <li>Your top 3 gaps, in plain words</li>
            <li>Up to 10 AI calls per day</li>
          </ul>
          <Link
            to="/diagnosis"
            className="mt-6 inline-flex rounded-lg bg-terracotta px-5 py-3 text-[13.5px] font-semibold text-primary-foreground"
          >
            Start free →
          </Link>
        </div>

        <div className="rounded-2xl border-2 border-terracotta p-6">
          <h2 className="text-xl font-bold">Proof Plan</h2>
          <p className="mt-1 text-2xl font-bold">Rs 499/month</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed">
            <li>Everything in Free, plus a full roadmap of proof tasks</li>
            <li>Recruiter-style audit after each proof task</li>
            <li>Weekly proof checks — did you actually build it, or just claim it?</li>
            <li>Up to 100 AI calls per day</li>
          </ul>
          <PayWithSafepayButton />
          <p className="mt-6 text-[13.5px] leading-relaxed text-muted-foreground">
            Until Safepay approves the account, beta payment is manual: pay Rs 499/month by
            JazzCash or Easypaisa, send your payment screenshot, and your Proof Plan is
            activated by the founder. Once Safepay is live, the Pay button above activates
            it automatically — no screenshot, no waiting.
          </p>
          <Link
            to="/diagnosis"
            className="mt-4 inline-flex rounded-lg border border-terracotta px-5 py-3 text-[13.5px] font-semibold text-terracotta"
          >
            Start free, then upgrade →
          </Link>
        </div>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Scores and audits are guidance based on the evidence you provide — not a guarantee of an
        interview or a job. See the{" "}
        <Link to="/terms" className="font-semibold text-terracotta hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="font-semibold text-terracotta hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
