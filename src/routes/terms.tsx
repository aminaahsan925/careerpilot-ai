import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 30 October 2026</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground">
        <p>
          By creating an account on CareerPilot AI, you agree to these terms. The service is built
          for students preparing for backend software roles.
        </p>
        <h2 className="text-xl font-bold">What the service does</h2>
        <p>
          CareerPilot AI compares your resume, projects, and skills with a target backend job, and
          gives you one readiness score, the gaps that cost interviews, and proof tasks to build
          next. It does not find you a job, contact employers for you, or guarantee any outcome.
        </p>
        <h2 className="text-xl font-bold">Your responsibilities</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Provide information that is yours and that you are allowed to share.</li>
          <li>Do not upload someone else&apos;s resume, private documents, or credentials.</li>
          <li>Do not use the service to misrepresent your skills, projects, or experience to an employer.</li>
          <li>Keep your sign-in details private.</li>
        </ul>
        <h2 className="text-xl font-bold">AI usage limits</h2>
        <p>
          AI analyses are limited per day so the service stays available for everyone. If the limit
          is reached, AI features pause with a clear message until the next day. Limits may change,
          and any change will be shown in the product before it affects you.
        </p>
        <h2 className="text-xl font-bold">No guarantees</h2>
        <p>
          Readiness scores, market data, and mentor answers are based on the evidence you provide
          and on third-party data that can become out of date. They are guidance only. CareerPilot AI
          is not liable for a hiring decision, a rejected application, or a career choice you make
          based on the service.
        </p>
        <h2 className="text-xl font-bold">Changes</h2>
        <p>
          These terms may be updated as the product changes. The date at the top of this page shows
          the latest version. Continued use after an update means you accept the updated terms.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="font-semibold text-terracotta hover:underline">
            Back to the homepage
          </Link>
          {" · "}
          <Link to="/privacy" className="font-semibold text-terracotta hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
