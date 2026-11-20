import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-cp-ink text-cp-paper">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-cp-lime">
          Legal
        </p>
        <h1 className="editorial-title mt-4 font-display text-[clamp(2.25rem,5vw,3.5rem)]">
          Terms of Use
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-cp-stone">
          Last updated: 30 October 2026
        </p>
        <div aria-hidden="true" className="mt-8 h-px w-full bg-cp-lime/25" />
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>
            By creating an account on CareerPilot AI, you agree to these terms. The service is built
            for students preparing for backend software roles.
          </p>
          <h2 className="border-l-2 border-cp-lime pl-3 font-display text-xl font-bold">
            What the service does
          </h2>
          <p>
            CareerPilot AI compares your resume, projects, and skills with a target backend job, and
            gives you one readiness score, the gaps that cost interviews, and proof tasks to build
            next. It does not find you a job, contact employers for you, or guarantee any outcome.
          </p>
          <h2 className="border-l-2 border-cp-lime pl-3 font-display text-xl font-bold">
            Your responsibilities
          </h2>
          <ul className="list-disc space-y-2 pl-6 marker:text-cp-lime">
            <li>Provide information that is yours and that you are allowed to share.</li>
            <li>Do not upload someone else&apos;s resume, private documents, or credentials.</li>
            <li>Do not use the service to misrepresent your skills, projects, or experience to an employer.</li>
            <li>Keep your sign-in details private.</li>
          </ul>
          <h2 className="border-l-2 border-cp-lime pl-3 font-display text-xl font-bold">
            AI usage limits
          </h2>
          <p>
            AI analyses are limited per day so the service stays available for everyone. If the limit
            is reached, AI features pause with a clear message until the next day. Limits may change,
            and any change will be shown in the product before it affects you.
          </p>
          <h2 className="border-l-2 border-cp-lime pl-3 font-display text-xl font-bold">
            No guarantees
          </h2>
          <p>
            Readiness scores, market data, and mentor answers are based on the evidence you provide
            and on third-party data that can become out of date. They are guidance only. CareerPilot AI
            is not liable for a hiring decision, a rejected application, or a career choice you make
            based on the service.
          </p>
          <h2 className="border-l-2 border-cp-lime pl-3 font-display text-xl font-bold">
            Changes
          </h2>
          <p>
            These terms may be updated as the product changes. The date at the top of this page shows
            the latest version. Continued use after an update means you accept the updated terms.
          </p>
          <p className="text-sm text-cp-stone">
            <Link to="/" className="font-semibold text-cp-lime hover:underline">
              Back to the homepage
            </Link>
            {" · "}
            <Link to="/privacy" className="font-semibold text-cp-lime hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
