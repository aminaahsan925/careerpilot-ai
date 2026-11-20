import { FEATURED_COMPANIES, matchCompanyTruth, PAKISTAN_COMPANY_DIRECTORY } from "./company-truth";
import { resolveRoleProfile, type RoleTruthProfile } from "./market-truth";

export type InterviewQuestion = {
  question: string;
  category: "technical" | "system_design" | "behavioral";
  whatItTests: string;
  strongAnswer: string;
  companySignal: string;
};

export type InterviewMcq = {
  id: string;
  level: 1 | 2 | 3 | 4;
  difficulty: "Foundation" | "Applied" | "Advanced" | "Scenario";
  question: string;
  options: Array<{ id: "a" | "b" | "c" | "d"; text: string }>;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
  hiringSignal: string;
};

export type InterviewIntel = {
  role: string;
  company: string;
  companyTagline: string;
  /** False when the selected company has no researched hiring profile; content is role-based only then. */
  companyResearched: boolean;
  stages: string[];
  focusAreas: string[];
  questions: InterviewQuestion[];
  mcqs: InterviewMcq[];
  note: string;
};

const ROLE_QUESTIONS: Record<string, InterviewQuestion[]> = {
  "frontend-react": [
    {
      question:
        "A React page re-renders on every keystroke and feels slow. How do you investigate and fix it?",
      category: "technical",
      whatItTests: "React rendering, profiling, state placement, and performance judgement.",
      strongAnswer:
        "Start with the React Profiler, isolate the state owner, remove unnecessary renders, and only then use memoisation where measurement justifies it.",
      companySignal: "Frontend screens increasingly test internals, not just component syntax.",
    },
    {
      question:
        "How would you build a resilient data-fetching component for loading, empty, error, and retry states?",
      category: "technical",
      whatItTests: "Production UI thinking, accessibility, API boundaries, and failure handling.",
      strongAnswer:
        "Describe explicit state transitions, cancellation or stale-request protection, keyboard-friendly feedback, and a retry path that does not duplicate mutations.",
      companySignal: "Teams filter out portfolio UIs that only demonstrate the happy path.",
    },
    {
      question:
        "When would you choose server rendering, client rendering, or a server component for a feature?",
      category: "system_design",
      whatItTests:
        "Client-server boundaries, performance, security, and modern React architecture.",
      strongAnswer:
        "Tie the choice to data sensitivity, interactivity, cacheability, SEO, latency, and bundle size rather than treating one rendering mode as universally correct.",
      companySignal: "Modern frontend interviews probe architecture and trade-offs.",
    },
    {
      question:
        "Tell me about a production bug you found, the evidence you used, and the smallest safe fix.",
      category: "behavioral",
      whatItTests: "Debugging discipline, ownership, communication, and measurable impact.",
      strongAnswer:
        "Use a concise situation-evidence-action-result story with a link, metric, test, or before/after observation.",
      companySignal:
        "A deployed project with a visible commit trail is stronger than a list of frontend skills.",
    },
  ],
  "backend-node-python": [
    {
      question:
        "An endpoint is fast with 100 rows but slow with 1 million. How do you diagnose and fix it?",
      category: "technical",
      whatItTests: "Query plans, indexes, pagination, caching, and measurement.",
      strongAnswer:
        "Measure first, inspect EXPLAIN, add the right composite or covering index, paginate intentionally, and verify the change under realistic data.",
      companySignal:
        "Backend hiring bars expect database reasoning, not only framework familiarity.",
    },
    {
      question: "Design an idempotent payment or order-creation API that can safely be retried.",
      category: "system_design",
      whatItTests: "Transactions, idempotency keys, consistency, and failure recovery.",
      strongAnswer:
        "Cover an idempotency key, unique constraint, transaction boundary, durable status transitions, and what happens when the downstream provider times out.",
      companySignal:
        "Fintech and enterprise teams use business-logic scenarios to separate syntax from engineering judgement.",
    },
    {
      question:
        "What belongs in a unit test, integration test, and contract test for a REST service?",
      category: "technical",
      whatItTests: "Testing strategy, maintainability, and API reliability.",
      strongAnswer:
        "Explain the confidence/speed trade-off and show that the database and external boundaries are tested without making every test an end-to-end test.",
      companySignal:
        "A public repository with tests is evidence; a testing keyword is only a claim.",
    },
    {
      question:
        "Describe a time you changed an API or schema without breaking an existing consumer.",
      category: "behavioral",
      whatItTests: "Ownership, backwards compatibility, migration planning, and communication.",
      strongAnswer:
        "Show the rollout sequence, compatibility window, monitoring, and how you knew it was safe to remove the old path.",
      companySignal: "Interviewers look for production habits even in junior candidates.",
    },
  ],
  "full-stack": [
    {
      question:
        "Walk through a feature from browser click to database write, including authentication and failure states.",
      category: "system_design",
      whatItTests: "End-to-end ownership, API design, auth, persistence, and debugging.",
      strongAnswer:
        "Trace the request, authorization check, validation, transaction, response, UI state, and observability. Call out what can fail at each boundary.",
      companySignal:
        "Full-stack roles reward candidates who can explain the whole system, not only the screen.",
    },
    {
      question: "How would you model roles and permissions for a multi-tenant application?",
      category: "system_design",
      whatItTests: "Data modelling, tenant isolation, authorization, and secure defaults.",
      strongAnswer:
        "Use tenant-scoped records, server-side authorization on every access path, least privilege, and tests for cross-tenant leakage.",
      companySignal: "Enterprise employers often treat auth and data isolation as non-negotiable.",
    },
    {
      question: "What would you log and measure after deploying a new feature?",
      category: "technical",
      whatItTests: "Operational maturity, observability, performance, and product thinking.",
      strongAnswer:
        "Name useful events, errors, latency, adoption, and a rollback signal while avoiding sensitive data in logs.",
      companySignal:
        "Deployment proof matters when it includes how the candidate operated the system.",
    },
    {
      question:
        "What trade-off did you make in a project, and what would you change with twice the time?",
      category: "behavioral",
      whatItTests: "Self-awareness, prioritisation, and technical communication.",
      strongAnswer:
        "State the constraint, the decision, the consequence, and a specific next improvement instead of pretending the project was perfect.",
      companySignal: "This is a high-signal portfolio walkthrough question.",
    },
  ],
  "data-analyst-scientist": [
    {
      question:
        "A dashboard metric drops 20% overnight. What do you check before presenting the result?",
      category: "technical",
      whatItTests:
        "Data quality, query validation, statistical judgement, and stakeholder communication.",
      strongAnswer:
        "Check pipeline freshness, definitions, joins, filters, sampling, instrumentation, and segment the change before claiming a business explanation.",
      companySignal:
        "Analyst interviews test whether you can distinguish a signal from a broken dashboard.",
    },
    {
      question:
        "How would you choose between an inner join and a left join for a customer analysis?",
      category: "technical",
      whatItTests: "SQL correctness and awareness of silent data loss.",
      strongAnswer:
        "Explain the business question, the grain of each table, unmatched records, and how you would validate row counts after the join.",
      companySignal: "SQL beyond SELECT * is a common entry filter.",
    },
    {
      question:
        "How do you explain an analysis to a non-technical stakeholder who only wants the decision?",
      category: "behavioral",
      whatItTests: "Clarity, business framing, uncertainty, and recommendation quality.",
      strongAnswer:
        "Lead with the decision, show the evidence and uncertainty, name the limitation, and propose the next measurable action.",
      companySignal:
        "Communication is a differentiator when routine reporting is increasingly automated.",
    },
    {
      question: "Design a small experiment to test whether a product change improves activation.",
      category: "system_design",
      whatItTests: "Hypothesis design, metrics, bias, sample size, and interpretation.",
      strongAnswer:
        "Define the population, primary metric, guardrails, randomisation, duration, and what result would change the decision.",
      companySignal: "Strong candidates connect analysis to a business question, not just a chart.",
    },
  ],
  "mobile-flutter-react-native": [
    {
      question: "How do you handle offline state, retries, and a slow network in a mobile feature?",
      category: "technical",
      whatItTests: "Mobile resilience, lifecycle awareness, local state, and user feedback.",
      strongAnswer:
        "Describe a clear source of truth, queued or retryable work, idempotency, offline messaging, and how the UI recovers when connectivity returns.",
      companySignal:
        "A published app with real failure handling is stronger than a screenshot gallery.",
    },
    {
      question: "A list scrolls poorly on an older device. How do you profile and improve it?",
      category: "technical",
      whatItTests: "Rendering, memory, image handling, list virtualisation, and measurement.",
      strongAnswer:
        "Profile on a representative device, reduce unnecessary renders and payloads, optimise images, and verify frame performance after each change.",
      companySignal: "Mobile teams probe performance under constraints, not only layout skills.",
    },
    {
      question:
        "How would you ship a breaking API change while keeping the current app version working?",
      category: "system_design",
      whatItTests: "Versioning, release coordination, backwards compatibility, and testing.",
      strongAnswer:
        "Use additive API changes, capability/version negotiation, staged rollout, telemetry, and a deprecation plan.",
      companySignal: "Published apps make release discipline visible.",
    },
    {
      question:
        "What did you learn from a real user, crash report, or store review and how did you respond?",
      category: "behavioral",
      whatItTests: "Product ownership, feedback loops, and iteration.",
      strongAnswer:
        "Connect feedback to a shipped change and show how you measured whether it improved the user experience.",
      companySignal: "Employers want evidence that the candidate can ship beyond a local demo.",
    },
  ],
  "devops-cloud": [
    {
      question:
        "A deployment succeeds but the service returns 5xx errors. What is your first 15-minute response?",
      category: "technical",
      whatItTests:
        "Incident triage, logs, health checks, rollback judgement, and calm prioritisation.",
      strongAnswer:
        "Confirm blast radius, inspect logs and metrics, compare the release, protect users with rollback or mitigation, then preserve evidence for root cause analysis.",
      companySignal: "Cloud interviews reward safe operations over memorised service lists.",
    },
    {
      question:
        "How would you design a CI/CD pipeline that prevents an unsafe change from reaching production?",
      category: "system_design",
      whatItTests: "Quality gates, secrets, environments, approvals, and deployment strategy.",
      strongAnswer:
        "Include lint/tests, security checks, artifact immutability, environment separation, least-privilege secrets, staged rollout, and rollback.",
      companySignal: "A working pipeline is a much stronger signal than saying Docker or AWS.",
    },
    {
      question:
        "What is the difference between horizontal and vertical scaling, and when would you use each?",
      category: "technical",
      whatItTests: "Capacity reasoning, bottleneck diagnosis, and architecture fundamentals.",
      strongAnswer:
        "Relate the choice to state, cost, limits, fault tolerance, and the bottleneck you measured.",
      companySignal: "Systems and cloud screens test reasoning under realistic constraints.",
    },
    {
      question:
        "Tell me about a time you automated a repetitive or failure-prone engineering task.",
      category: "behavioral",
      whatItTests: "Initiative, leverage, safety, and measurable impact.",
      strongAnswer:
        "Show the old manual risk, the automation, guardrails, and a concrete time or failure-rate improvement.",
      companySignal: "Operational ownership differentiates early-career cloud candidates.",
    },
  ],
  "qa-automation": [
    {
      question:
        "A test passes locally but fails intermittently in CI. How do you make the failure diagnosable?",
      category: "technical",
      whatItTests: "Flake isolation, test determinism, environment control, and evidence.",
      strongAnswer:
        "Capture logs, traces, screenshots, timing, and environment details; remove shared state and fixed sleeps; then reproduce under controlled retries.",
      companySignal: "Automation hiring values reliable signal, not a large test count.",
    },
    {
      question: "What should be covered by API tests versus browser end-to-end tests?",
      category: "system_design",
      whatItTests: "Test pyramid judgement, coverage, speed, and risk prioritisation.",
      strongAnswer:
        "Put most business-rule coverage near the API or service boundary and reserve browser tests for critical user journeys and integration risk.",
      companySignal: "Strong QA engineers explain why a test exists and what risk it retires.",
    },
    {
      question: "How do you decide whether a bug should block a release?",
      category: "technical",
      whatItTests: "Risk assessment, severity, user impact, and communication.",
      strongAnswer:
        "Use reproducibility, affected users, data/security risk, workaround, release scope, and explicit stakeholder sign-off.",
      companySignal: "Decision quality matters more than treating every defect equally.",
    },
    {
      question: "Describe a quality improvement you introduced and how you proved it worked.",
      category: "behavioral",
      whatItTests: "Ownership, collaboration, and measurable quality outcomes.",
      strongAnswer:
        "Give a before/after metric such as escaped defects, runtime, flaky rate, or feedback cycle time.",
      companySignal: "A documented test strategy is stronger proof than a certification badge.",
    },
  ],
  "ui-ux-design": [
    {
      question: "How would you turn ambiguous user feedback into a design decision?",
      category: "behavioral",
      whatItTests: "Research synthesis, prioritisation, and evidence-based design.",
      strongAnswer:
        "Cluster the feedback, identify the underlying job, validate the riskiest assumption, and define a measurable success signal.",
      companySignal: "Product teams want evidence of user reasoning, not only polished screens.",
    },
    {
      question: "Show how you would improve a flow with a high drop-off rate.",
      category: "system_design",
      whatItTests: "Funnel analysis, usability, accessibility, and iteration.",
      strongAnswer:
        "Locate the drop-off, observe users, form hypotheses, prototype a focused change, and test it against a defined metric.",
      companySignal:
        "A portfolio should explain decisions and outcomes, not just display final visuals.",
    },
    {
      question: "How do you make a design usable for keyboard and screen-reader users?",
      category: "technical",
      whatItTests:
        "Accessibility fundamentals, inclusive interaction design, and implementation partnership.",
      strongAnswer:
        "Cover semantic structure, focus order, labels, contrast, states, error recovery, and testing with assistive technology.",
      companySignal: "Accessibility is increasingly an explicit hiring expectation.",
    },
    {
      question: "Tell me about a time research changed your original design direction.",
      category: "behavioral",
      whatItTests: "Humility, collaboration, and learning velocity.",
      strongAnswer:
        "State the original assumption, the evidence that challenged it, the changed design, and the outcome.",
      companySignal:
        "The ability to defend and revise a decision is a high-signal portfolio skill.",
    },
  ],
};

const GENERIC_QUESTIONS: InterviewQuestion[] = [
  {
    question:
      "Walk through the strongest project you have built, the hardest decision, and the evidence it works.",
    category: "behavioral",
    whatItTests: "Ownership, technical depth, and ability to communicate trade-offs.",
    strongAnswer:
      "Explain the user problem, architecture, constraint, decision, measurable outcome, and what you would improve.",
    companySignal:
      "Every employer can ask this; a deployed link and clear README make the answer credible.",
  },
  {
    question:
      "Solve a small problem out loud. How do you clarify requirements and verify your solution?",
    category: "technical",
    whatItTests: "Problem-solving process, communication, edge cases, and testing.",
    strongAnswer:
      "Ask clarifying questions, state an approach, discuss complexity, test examples and edge cases, then improve if needed.",
    companySignal: "Technical screens assess reasoning, not only the final code.",
  },
  {
    question: "How do you decide whether a technology is worth learning for your target role?",
    category: "system_design",
    whatItTests: "Market awareness, prioritisation, and ability to connect learning to outcomes.",
    strongAnswer:
      "Compare recurring job requirements, current evidence, project relevance, and the cost of learning it now.",
    companySignal: "Employers reward focused depth over a long unproven tools list.",
  },
  {
    question: "Tell me about feedback that changed how you work.",
    category: "behavioral",
    whatItTests: "Coachability, self-awareness, and growth mindset.",
    strongAnswer: "Give the feedback, the behaviour you changed, and the observable result.",
    companySignal: "This is a common final-round signal for early-career hiring.",
  },
];

export function getInterviewCompanies() {
  const curated = FEATURED_COMPANIES.map((company) => ({ id: company.id, name: company.name }));
  const directory = PAKISTAN_COMPANY_DIRECTORY.map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
  }));
  return [
    ...curated,
    ...directory.filter((item) => !curated.some((company) => company.name === item.name)),
  ];
}

export function buildInterviewIntel(
  targetRole: string,
  companyName?: string | null,
): InterviewIntel {
  const roleProfile: RoleTruthProfile = resolveRoleProfile(targetRole || "Technology role");
  const hasCompany = Boolean(companyName?.trim());
  const company = hasCompany ? matchCompanyTruth(companyName) : null;
  const isGroundedCompany = Boolean(
    company && FEATURED_COMPANIES.some((item) => item.id === company.id),
  );
  const questions = (ROLE_QUESTIONS[roleProfile.roleId] ?? GENERIC_QUESTIONS).map((question) => ({
    ...question,
    companySignal: company
      ? question.companySignal.replace("Every employer", `${company.name} and most employers`)
      : question.companySignal,
  }));

  const roleSkill = roleProfile.mustHaveSkills[0]?.skill ?? "the core skills for this role";
  const companySkill = company?.hiringBar.nonNegotiables[0]?.skill ?? roleSkill;
  const stack =
    company?.primaryStack[0] ?? roleProfile.commonTools[0]?.skill ?? "the role's main stack";
  const proof = company?.projectExpectation.mustHaveFeatures[0] ?? "a tested, deployed project";
  const companyLabel = company?.name ?? "the target industry";
  const mcqs: InterviewMcq[] = [
    {
      id: "foundation-role-signal",
      level: 1,
      difficulty: "Foundation",
      question: `For an entry-level ${roleProfile.displayName} screen, which preparation best demonstrates ${roleSkill}?`,
      options: [
        { id: "a", text: "List the skill in a resume skills section only." },
        {
          id: "b",
          text: `Build a small ${roleProfile.displayName} feature and explain the design decisions.`,
        },
        { id: "c", text: "Memorise framework definitions without writing code." },
        { id: "d", text: "Collect certificates without a working example." },
      ],
      correctOption: "b",
      explanation:
        "Entry-level screens reward a concrete implementation and the ability to explain it, not an unverified claim.",
      hiringSignal: `${roleProfile.displayName} fundamentals`,
    },
    {
      id: "foundation-company-bar",
      level: 1,
      difficulty: "Foundation",
      question: `${companyLabel} screens for ${companySkill}. Which answer is the strongest first signal?`,
      options: [
        { id: "a", text: `A working example that proves ${companySkill}, with tests or evidence.` },
        { id: "b", text: "A long list of unrelated tools." },
        { id: "c", text: "A copied tutorial with no explanation." },
        { id: "d", text: "A claim that the skill is easy to learn later." },
      ],
      correctOption: "a",
      explanation: `The hiring bar is based on demonstrated evidence for ${companySkill}, not a keyword-only claim.`,
      hiringSignal: `${companyLabel} screening bar`,
    },
    {
      id: "applied-stack-debugging",
      level: 2,
      difficulty: "Applied",
      question: `A ${roleProfile.displayName} feature using ${stack} works locally but fails for real users. What should you do first?`,
      options: [
        { id: "a", text: "Rewrite the whole feature in another framework." },
        { id: "b", text: "Add more libraries before observing the failure." },
        {
          id: "c",
          text: "Reproduce it, inspect logs and inputs, then isolate the failing boundary.",
        },
        { id: "d", text: "Hide the error and ask the user to retry indefinitely." },
      ],
      correctOption: "c",
      explanation:
        "A production-minded candidate gathers evidence first, isolates the boundary, and then makes the smallest safe fix.",
      hiringSignal: `${stack} debugging discipline`,
    },
    {
      id: "applied-proof",
      level: 2,
      difficulty: "Applied",
      question: `Which project deliverable would best satisfy ${companyLabel}'s requirement for ${proof}?`,
      options: [
        { id: "a", text: "A screenshot of an unfinished local app." },
        {
          id: "b",
          text: "A deployed link plus a readable repository and a short verification note.",
        },
        { id: "c", text: "A private repository with no setup instructions." },
        { id: "d", text: "A slide listing planned features." },
      ],
      correctOption: "b",
      explanation:
        "A recruiter can verify a deployed result, inspect the implementation, and understand how to run it.",
      hiringSignal: "Employer-verifiable proof",
    },
    {
      id: "advanced-tradeoff",
      level: 3,
      difficulty: "Advanced",
      question: `You must ship a ${roleProfile.displayName} feature by Friday. Which trade-off best matches ${companyLabel}'s hiring bar?`,
      options: [
        { id: "a", text: "Ship the happy path with no validation or tests." },
        {
          id: "b",
          text: "Cut scope, keep the critical path tested, document the risk, and measure the result.",
        },
        { id: "c", text: "Delay all feedback until every possible feature is complete." },
        { id: "d", text: "Copy a similar product without checking its constraints." },
      ],
      correctOption: "b",
      explanation:
        "The best answer shows prioritisation, quality protection, explicit risk, and measurable delivery.",
      hiringSignal: "Engineering judgement under constraints",
    },
    {
      id: "advanced-architecture",
      level: 3,
      difficulty: "Advanced",
      question: `A ${roleProfile.displayName} service has rising latency after adoption grows. Which investigation is most defensible?`,
      options: [
        {
          id: "a",
          text: "Measure the request path, inspect database/query or render costs, then change the measured bottleneck.",
        },
        { id: "b", text: "Increase every server size without collecting a baseline." },
        { id: "c", text: "Remove error handling to reduce code paths." },
        { id: "d", text: "Add caching everywhere without checking stale-data risk." },
      ],
      correctOption: "a",
      explanation:
        "Strong candidates connect architecture decisions to measured bottlenecks and the feature's correctness constraints.",
      hiringSignal: "Performance and architecture reasoning",
    },
    {
      id: "scenario-panel",
      level: 4,
      difficulty: "Scenario",
      question: `During ${companyLabel}'s technical panel, a release of your ${roleProfile.displayName} project causes errors. What is the best response?`,
      options: [
        { id: "a", text: "Blame the deployment platform and continue presenting." },
        {
          id: "b",
          text: "Rollback or mitigate safely, state what you know, preserve evidence, and explain the follow-up fix.",
        },
        { id: "c", text: "Delete the failing feature so the dashboard looks normal." },
        { id: "d", text: "Ignore it because interview code does not need operations." },
      ],
      correctOption: "b",
      explanation:
        "The response demonstrates ownership, incident judgement, communication, and operational maturity.",
      hiringSignal: "Production ownership",
    },
    {
      id: "scenario-decision",
      level: 4,
      difficulty: "Scenario",
      question: `Which final answer would most convince ${companyLabel} that your ${roleProfile.displayName} project is ready for users?`,
      options: [
        { id: "a", text: "It uses many popular technologies." },
        { id: "b", text: "It looks good in a screenshot." },
        {
          id: "c",
          text: "It has a verified workflow, tests, deployment evidence, and a measured outcome.",
        },
        { id: "d", text: "It was generated quickly with no tracked decisions." },
      ],
      correctOption: "c",
      explanation:
        "A hiring panel can trust a project when the candidate can show the workflow, quality controls, deployment, and outcome.",
      hiringSignal: "End-to-end proof and impact",
    },
  ];

  return {
    role: roleProfile.displayName,
    company: company?.name ?? "General industry",
    companyTagline:
      company?.tagline ??
      `General hiring standards and best practices for ${roleProfile.displayName} interviews.`,
    companyResearched: isGroundedCompany,
    stages: company?.hiringBar.evaluationStages ?? [
      "1. Role fundamentals and problem solving",
      "2. Technical and system design discussion",
      "3. Behavioral and project evidence review",
    ],
    focusAreas: company
      ? [
          ...company.interviewPreparation.dsaFocus.slice(0, 2),
          ...company.interviewPreparation.coreTheory.slice(0, 3),
          ...company.interviewPreparation.behavioralKeys.slice(0, 2),
        ]
      : [
          ...roleProfile.mustHaveSkills.slice(0, 3).map((skill) => skill.skill),
          ...roleProfile.commonTools.slice(0, 2).map((skill) => skill.skill),
        ],
    questions,
    mcqs,
    note:
      company && isGroundedCompany
        ? `These MCQs are grounded in ${company.name}'s recorded hiring bar and ${roleProfile.displayName} requirements, not leaked interview questions.`
        : hasCompany
          ? `“${companyName!.trim()}” is not researched yet, so these MCQs use general industry best practices for ${roleProfile.displayName}; verify them against the employer's job description.`
          : `These MCQs use general industry best practices for ${roleProfile.displayName}; select a company for employer-specific standards.`,
  };
}
