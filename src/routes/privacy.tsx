import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 30 October 2026</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground">
        <p>
          CareerPilot AI helps final-year computer science students in Pakistan prove their
          backend-job readiness. This policy explains, in plain words, what we collect and why.
        </p>
        <h2 className="text-xl font-bold">What we collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Account details you provide: email address and name.</li>
          <li>Profile details you provide: education, skills, projects, and career goals.</li>
          <li>Resumes and job descriptions you upload or paste, so we can analyse them against a target role.</li>
          <li>Basic usage data needed to run the service, including your daily AI usage count for quota limits.</li>
        </ul>
        <h2 className="text-xl font-bold">How we use it</h2>
        <p>
          Your data is used only to provide your readiness score, gaps, roadmap, and mentor answers.
          When you run an AI analysis, the relevant resume, profile, and job text are sent to the AI
          provider that powers that analysis. We do not sell your personal data.
        </p>
        <h2 className="text-xl font-bold">Where it is stored</h2>
        <p>
          Account and profile data are stored with our database provider (Supabase). Uploaded files
          are stored in the same account system. Access is protected by sign-in; other users cannot
          see your private profile, resume, or analysis results.
        </p>
        <h2 className="text-xl font-bold">Honest limits</h2>
        <p>
          Scores, gaps, and mentor answers are guidance based on the evidence you provide. They are
          not a guarantee of an interview or a job, and AI output can be wrong. Always check a job
          posting and a recruiter&apos;s feedback yourself before acting on a suggestion.
        </p>
        <h2 className="text-xl font-bold">Your choices</h2>
        <p>
          You can edit your profile and skills from the Profile page at any time. If you want your
          account data removed, sign out of shared devices first and contact us through the LinkedIn
          profile linked on the homepage, stating the email address on your account.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="font-semibold text-terracotta hover:underline">
            Back to the homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
