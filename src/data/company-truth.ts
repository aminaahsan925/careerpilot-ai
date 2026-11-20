/**
 * Company Truth & Hiring Intelligence Dataset
 *
 * Grounded data on real hiring bars, rejection reasons, interview standards,
 * and technical requirements for top technology employers in Pakistan & Global Tech.
 */

import type { AtsBoard } from "@/lib/jobs/ats-providers";

export type CompanyHiringTruth = {
  id: string;
  name: string;
  /**
   * Provenance (Wave 2 seed review). These profiles have NO research on
   * file: no cited sources, no research date. They ship as unverified
   * seed data — `sources: []`, `researchedOn: null`, `verified: false`
   * — and the UI badges them "unverified seed data — research date
   * unknown". A profile becomes verified only through a real research
   * run (Tavily careers-page research or a live ATS board), which sets
   * these fields from its own result. Never fill them in by hand.
   */
  sources?: string[];
  researchedOn?: string | null;
  verified?: boolean;
  /**
   * The company's public ATS job board, when verifiable (careers page
   * links the board, or the board API answers for the token). Null =
   * no verifiable board; the company uses Tavily research instead.
   * Never guess a token.
   */
  atsBoard?: AtsBoard | null;
  shortName: string;
  category:
    | "Enterprise IT"
    | "Fintech & Products"
    | "Services & Consulting"
    | "High-Scale Tech"
    | "Global Tech";
  location: string;
  tier: string;
  tagline: string;
  accentColor: string;
  entryRoles: string[];
  primaryStack: string[];
  hiringBar: {
    /**
     * @deprecated Unsourced statistic — dropped from all 8 seeds in the
     * Wave 2 source review (no cited source for any screening-rate
     * percentage). Kept optional only so older consumers compile; the
     * recruiter prompt must stop interpolating it. Never set a value
     * without a cited source.
     */
    screeningFilterRate?: string;
    evaluationStages: string[];
    nonNegotiables: {
      skill: string;
      whyRequired: string;
      level: "Crucial" | "High Priority" | "Differentiator";
    }[];
  };
  rejectionTruths: {
    rank: number;
    title: string;
    whyCompanyRejects: string;
    whatCandidateDidWrong: string;
    fixAction: string;
  }[];
  projectExpectation: {
    title: string;
    mustHaveFeatures: string[];
    unacceptableClones: string[];
    recommendedTechStack: string[];
  };
  interviewPreparation: {
    dsaFocus: string[];
    coreTheory: string[];
    behavioralKeys: string[];
  };
};

export const FEATURED_COMPANIES: CompanyHiringTruth[] = [
  {
    id: "systems-limited",
    name: "Systems Limited",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "Systems",
    category: "Enterprise IT",
    location: "Lahore / Karachi / Islamabad / Global",
    tier: "Tier 1 Enterprise IT Exporter",
    tagline:
      "Pakistan's largest IT exporter (CMMI Level 5) with rigorous enterprise engineering standards.",
    accentColor: "#E05A47",
    entryRoles: [
      "Associate Software Engineer",
      "Associate Full-Stack Developer",
      "Associate Cloud / DevOps Engineer",
      "Associate Data / BI Engineer",
      "Associate SQA Engineer",
    ],
    primaryStack: [
      ".NET / C#",
      "Java / Spring Boot",
      "MERN (React/Node)",
      "PostgreSQL / SQL Server",
      "Azure / AWS",
      "Docker",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Automated ATS Resume Keyword & Project Footprint Filter",
        "2. Online Coding Assessment (DSA, OOP, SQL queries, logical reasoning)",
        "3. Technical Panel Interview (Live coding, DB normalization & indexing, Architecture)",
        "4. HR & Cultural Fit Assessment",
      ],
      nonNegotiables: [
        {
          skill: "Strict OOP & SOLID Principles",
          whyRequired:
            "Enterprise client codebases mandate maintainable, decoupled design patterns over quick hacks.",
          level: "Crucial",
        },
        {
          skill: "Relational Database Indexing & Query Tuning",
          whyRequired:
            "Enterprise clients process millions of transactions; slow un-indexed queries fail production code reviews.",
          level: "Crucial",
        },
        {
          skill: "Live Deployed Project with Verified GitHub Repository",
          whyRequired:
            "Localhost or clone projects are instantly screened out in the technical review.",
          level: "Crucial",
        },
        {
          skill: "DSA & Problem-Solving Speed",
          whyRequired:
            "Initial online assessment contains time-bound algorithmic challenges (arrays, hashing, trees).",
          level: "High Priority",
        },
        {
          skill: "Docker & Basic CI/CD Pipeline",
          whyRequired:
            "Junior engineers must know how to containerize their work and push through GitHub Actions.",
          level: "Differentiator",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Tutorial Clones Without Architectural Depth",
        whyCompanyRejects:
          "Systems Limited interviewers see hundreds of identical MERN Todo or E-commerce tutorial clones that show zero independent problem-solving.",
        whatCandidateDidWrong:
          "Copied YouTube tutorial projects without adding edge-case handling, caching, role-based auth, or database indexes.",
        fixAction:
          "Build a multi-tenant business portal with role-based access, Docker containerization, and public API documentation.",
      },
      {
        rank: 2,
        title: "Failing the Algorithmic & Coding Screening Round",
        whyCompanyRejects:
          "Many graduates fail the automated online test because they only practiced UI/web without practicing LeetCode / HackerRank problems.",
        whatCandidateDidWrong:
          "Memorized syntax but cannot solve medium-difficulty problems on Arrays, HashMaps, String manipulation, and recursion under a timer.",
        fixAction:
          "Solve 50 curated LeetCode Easy/Medium problems focused on Two Pointers, Sliding Window, and Hash Maps.",
      },
      {
        rank: 3,
        title: "Superficial Database & SQL Knowledge",
        whyCompanyRejects:
          "Junior candidates rely purely on simple ORM calls and cannot write raw joins, aggregate queries, or explain indexing and ACID properties.",
        whatCandidateDidWrong:
          "Never tested their database with 50,000+ rows or analyzed query execution plans (EXPLAIN ANALYZE).",
        fixAction:
          "Build a complex SQL schema with foreign keys, composite indexes, stored procedures/transactions, and benchmark response times.",
      },
      {
        rank: 4,
        title: "Weak ATS Resume Formatting & Metric-Free Claims",
        whyCompanyRejects:
          "Resume lists technologies ('Knows React, Node, C++') without demonstrable metrics, live links, or architectural proof.",
        whatCandidateDidWrong:
          "Wrote job responsibilities ('Worked on frontend') instead of measurable impact ('Reduced API latency by 35% with Redis caching').",
        fixAction:
          "Rewrite resume bullets using the Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z] with live links.",
      },
    ],
    projectExpectation: {
      title: "Enterprise Multi-Tenant SaaS or Operations Management System",
      mustHaveFeatures: [
        "JWT + Role-Based Access Control (Admin, Manager, User)",
        "Relational database schema with indexes and transaction management",
        "Redis caching layer for frequently accessed endpoints",
        "Docker Compose configuration for one-command local setup",
        "Unit & Integration test suite with >70% coverage",
        "Live deployment on AWS / Render / Vercel with Swagger API documentation",
      ],
      unacceptableClones: [
        "Basic Todo App",
        "Unstyled Weather App",
        "Simple Calculator",
        "Generic Blog without auth or tests",
      ],
      recommendedTechStack: [
        ".NET Web API or Node.js / Express",
        "PostgreSQL",
        "Redis",
        "Docker",
        "React / TypeScript",
        "GitHub Actions",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Arrays & Strings manipulation",
        "Hash Maps & Sets",
        "Two Pointer & Sliding Window",
        "Basic Binary Trees & BFS/DFS",
      ],
      coreTheory: [
        "OOP 4 pillars + SOLID principles",
        "REST API status codes & idempotency",
        "Database Normalization (1NF to 3NF) & Indexing",
        "Processes vs Threads & Concurrency",
      ],
      behavioralKeys: [
        "Why Systems Limited specifically",
        "Handling tight project deadlines",
        "Demonstrating continuous self-learning",
      ],
    },
  },
  {
    id: "netsol",
    name: "NetSol Technologies",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "NetSol",
    category: "Fintech & Products",
    location: "Lahore / Global",
    tier: "Global Asset Finance Software Giant",
    tagline: "Creators of world-leading enterprise leasing and finance platforms (NFS Ascent).",
    accentColor: "#2563EB",
    entryRoles: [
      "Associate Software Engineer (.NET / Java)",
      "Quality Assurance Associate",
      "Database Trainee",
    ],
    primaryStack: [
      "C# / .NET Core",
      "Java / Spring Boot",
      "Oracle / SQL Server",
      "Angular / React",
      "Microservices",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Resume screening for CS fundamentals and strong academic/project background",
        "2. In-depth technical test on C#/Java, Data Structures, and SQL",
        "3. Panel technical interview assessing concurrency, OOP design patterns, and enterprise DBs",
        "4. Executive cultural interview",
      ],
      nonNegotiables: [
        {
          skill: "Deep C# / Java Core Knowledge",
          whyRequired:
            "NetSol's financial engines rely heavily on multithreading, memory management, and clean OOP.",
          level: "Crucial",
        },
        {
          skill: "Complex Financial / Business Logic Modeling",
          whyRequired:
            "Software handles billions in asset financing; understanding state machines and transactions is mandatory.",
          level: "Crucial",
        },
        {
          skill: "Enterprise SQL & Stored Procedures",
          whyRequired: "Complex financial reporting demands advanced SQL queries.",
          level: "High Priority",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Weak Foundation in Object-Oriented Design & Design Patterns",
        whyCompanyRejects:
          "Candidates know language syntax but cannot implement Factory, Singleton, Strategy, or Repository patterns.",
        whatCandidateDidWrong:
          "Wrote all logic in monolithic controller files without separation of concerns.",
        fixAction:
          "Refactor backend code into a Clean Architecture / Onion Architecture pattern with Dependency Injection.",
      },
      {
        rank: 2,
        title: "Inability to Handle Complex Database Transactions",
        whyCompanyRejects:
          "NetSol builds financial systems where data corruption or race conditions cannot be tolerated.",
        whatCandidateDidWrong:
          "Never implemented database transactions, row-level locking, or idempotency keys.",
        fixAction:
          "Build a ledger or billing simulation service with strict ACID transaction guarantees.",
      },
      {
        rank: 3,
        title: "No Experience with Testing & QA Automation",
        whyCompanyRejects: "Untested code is considered dangerous in financial systems.",
        whatCandidateDidWrong: "Zero unit tests in GitHub repositories.",
        fixAction:
          "Add comprehensive unit test suites using xUnit or JUnit with mocking frameworks.",
      },
    ],
    projectExpectation: {
      title: "Fintech Ledger & Loan Amortization System",
      mustHaveFeatures: [
        "Double-entry bookkeeping ledger logic",
        "Loan repayment schedule calculation with variable interest rates",
        "ACID database transaction guarantees",
        "Automated reconciliation test suite",
      ],
      unacceptableClones: ["Basic CRUD App", "Simple Expense Tracker without double-entry"],
      recommendedTechStack: [
        "C# / .NET 8 or Java Spring Boot",
        "PostgreSQL / SQL Server",
        "Angular or React",
        "xUnit / JUnit",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Linked Lists & Stacks",
        "Hash Maps & Sorting Algorithms",
        "Recursion & Dynamic Programming basics",
      ],
      coreTheory: [
        "Garbage Collection & Memory Management in CLR/JVM",
        "Multithreading & Async/Await execution",
        "Database Isolation Levels",
      ],
      behavioralKeys: [
        "Attention to detail",
        "Interest in fintech and mission-critical enterprise systems",
      ],
    },
  },
  {
    id: "arbisoft",
    name: "Arbisoft",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "Arbisoft",
    category: "Services & Consulting",
    location: "Lahore / Remote",
    tier: "High-Caliber Engineering Consultancy",
    tagline: "Renowned for one of the most competitive entry-level technical tests in the country.",
    accentColor: "#059669",
    entryRoles: [
      "Software Engineer Trainee",
      "Full Stack Developer",
      "Python / Django Engineer",
      "Data Engineer",
    ],
    primaryStack: ["Python / Django", "React / TypeScript", "AWS", "PostgreSQL", "Docker"],
    hiringBar: {
      evaluationStages: [
        "1. Competitive Online Coding & Algorithmic Assessment",
        "2. Take-home problem or Live Coding Round",
        "3. Deep Technical Architecture & Problem Solving Interview",
        "4. Leadership / Culture Interview",
      ],
      nonNegotiables: [
        {
          skill: "Algorithmic Problem Solving (DSA)",
          whyRequired: "Arbisoft filters heavily on raw analytical intelligence and coding speed.",
          level: "Crucial",
        },
        {
          skill: "Clean Python / JavaScript Code Hygiene",
          whyRequired:
            "Clean, idiomatic code, linting, and modern best practices are non-negotiable.",
          level: "Crucial",
        },
        {
          skill: "Linux, Git & Command Line Fluency",
          whyRequired: "Engineers operate autonomously in cloud environments.",
          level: "High Priority",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Failing the Competitive Online Test",
        whyCompanyRejects: "Arbisoft's test has strict algorithmic and data structure cutoffs.",
        whatCandidateDidWrong:
          "Did not practice timed algorithm problem solving on platforms like LeetCode and Codeforces.",
        fixAction:
          "Complete the Blind 75 LeetCode question list with focus on time and space complexity analysis.",
      },
      {
        rank: 2,
        title: "Messy, Unformatted Code Without Best Practices",
        whyCompanyRejects:
          "Interviewers review GitHub code and reject spaghetti scripts without type safety or formatting.",
        whatCandidateDidWrong:
          "Single 500-line script files, no modularization, no docstrings, poor variable names.",
        fixAction:
          "Apply ESLint/Prettier or Black/Ruff, add type annotations (TypeScript/Python typing), and follow PEP8/clean code.",
      },
    ],
    projectExpectation: {
      title: "Real-Time Collaborative Workspace or Data Ingestion Pipeline",
      mustHaveFeatures: [
        "WebSocket real-time synchronization",
        "Clean asynchronous background workers (Celery / BullMQ)",
        "PostgreSQL with optimal schema design",
        "Fully automated CI/CD pipeline and cloud deployment",
      ],
      unacceptableClones: ["Basic Django polls app", "Simple HTML/CSS landing pages"],
      recommendedTechStack: [
        "Python / FastAPI or Django",
        "TypeScript / React",
        "PostgreSQL",
        "Redis",
        "Docker",
        "AWS",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Graph traversals (BFS/DFS)",
        "Dynamic Programming fundamentals",
        "Binary Search & Divide and Conquer",
      ],
      coreTheory: [
        "Time & Space Complexity Big-O",
        "HTTP Protocol & WebSockets",
        "Event Loops & Asynchronous I/O",
      ],
      behavioralKeys: [
        "Curiosity & passion for engineering excellence",
        "Self-driven technical projects",
      ],
    },
  },
  {
    id: "10pearls",
    name: "10Pearls",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "10Pearls",
    category: "Services & Consulting",
    location: "Karachi / Lahore / Islamabad / US",
    tier: "Global Digital Transformation & Product Innovation",
    tagline: "End-to-end digital partner working on modern web, mobile, AI, and cloud products.",
    accentColor: "#D97706",
    entryRoles: [
      "Associate Software Engineer",
      "Associate Full-Stack Developer",
      "Associate Mobile Developer (Flutter/React Native)",
    ],
    primaryStack: [
      "MERN / MEAN Stack",
      "Next.js / TypeScript",
      "Flutter / React Native",
      "AWS / Serverless",
      "MongoDB / PostgreSQL",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Resume review for modern stack alignment and live product demos",
        "2. Technical assessment covering Full Stack / Mobile fundamentals",
        "3. Live coding & system walk-through interview",
        "4. Final HR round",
      ],
      nonNegotiables: [
        {
          skill: "Modern TypeScript / Next.js / React proficiency",
          whyRequired:
            "10Pearls builds modern enterprise web products requiring high UI fidelity and performance.",
          level: "Crucial",
        },
        {
          skill: "REST / GraphQL API integration & State Management",
          whyRequired:
            "Real-world mobile and web apps require robust caching and state management (Zustand, Redux, TanStack Query).",
          level: "Crucial",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Lack of TypeScript & Modern State Management",
        whyCompanyRejects:
          "Candidates submit plain JavaScript without types or use antiquated prop-drilling.",
        whatCandidateDidWrong:
          "Built projects in plain JS without strict type contracts or modern asynchronous data fetching.",
        fixAction:
          "Rebuild your flagship project in TypeScript with TanStack Query and strict API response typing.",
      },
      {
        rank: 2,
        title: "No Live Working Deployment Link",
        whyCompanyRejects:
          "10Pearls recruiters test live demo links. If the link is broken or absent, the resume is dropped.",
        whatCandidateDidWrong:
          "Only provided a GitHub link that requires local npm install and database setup to test.",
        fixAction:
          "Deploy frontend on Vercel and backend on Render/Railway with a live, seeded demo account.",
      },
    ],
    projectExpectation: {
      title: "Interactive AI-Powered Analytics Dashboard or Mobile App",
      mustHaveFeatures: [
        "Responsive, high-polish UI with light/dark theme",
        "Full TypeScript codebase with strict mode",
        "Authentication + Protected routes",
        "Live deployed URL with seed demo data",
      ],
      unacceptableClones: ["Generic e-commerce template", "Basic notes app"],
      recommendedTechStack: [
        "Next.js 15 / React",
        "TypeScript",
        "Tailwind CSS",
        "Node.js / Hono",
        "PostgreSQL / Supabase",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Object and Array manipulations",
        "Promises, async/await, and event loop",
        "Common algorithmic puzzles",
      ],
      coreTheory: [
        "React component lifecycle & reconciliation",
        "State management patterns",
        "Web security (CORS, CSRF, XSS)",
      ],
      behavioralKeys: [
        "Agility and willingness to pick up new frameworks quickly",
        "Communication skills",
      ],
    },
  },
  {
    id: "devsinc",
    name: "Devsinc",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "Devsinc",
    category: "Services & Consulting",
    location: "Lahore / Islamabad / Remote",
    tier: "Fast-Growing Global Tech Consultancy",
    tagline:
      "High-velocity product development delivering solutions to Silicon Valley and global clients.",
    accentColor: "#8B5CF6",
    entryRoles: [
      "Trainee Software Engineer",
      "Associate Full-Stack Developer",
      "Ruby on Rails / Python / Node Developer",
    ],
    primaryStack: [
      "MERN / Full Stack",
      "Ruby on Rails",
      "Python / Django",
      "React / Next.js",
      "PostgreSQL / AWS",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Resume review and portfolio check",
        "2. Live coding test & technical interview",
        "3. System architectural & problem solving round",
      ],
      nonNegotiables: [
        {
          skill: "Rapid Full-Stack Prototyping & Delivery",
          whyRequired: "Devsinc engineers work with high-velocity international startups.",
          level: "Crucial",
        },
        {
          skill: "Clean API Design & Third-Party Integrations",
          whyRequired:
            "Stripe, OpenAI, Auth0, and Webhook integrations are standard in client projects.",
          level: "High Priority",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Slow Coding Speed and Inability to Live Code",
        whyCompanyRejects:
          "In live interviews, candidates freeze when asked to build a simple feature from scratch in 30 minutes.",
        whatCandidateDidWrong:
          "Always relied on copy-pasting code snippets without practicing live coding fundamentals.",
        fixAction:
          "Practice building complete mini-features (auth flow, pagination, search filter) from memory within 25 minutes.",
      },
    ],
    projectExpectation: {
      title: "SaaS Application with Stripe Billing & Webhooks",
      mustHaveFeatures: [
        "Stripe Checkout integration",
        "Webhook listener with signature verification",
        "Full CRUD with optimistic updates",
      ],
      unacceptableClones: ["Static portfolio with fake projects", "Todo list"],
      recommendedTechStack: [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Stripe API",
        "PostgreSQL / Prisma",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "String & Array operations",
        "Hash tables",
        "API mocking & asynchronous data flows",
      ],
      coreTheory: [
        "REST API Best Practices",
        "Database Indexing & Relations",
        "Microservices vs Monolith",
      ],
      behavioralKeys: ["High energy, hunger to learn, fast execution mindset"],
    },
  },
  {
    id: "folio3",
    name: "Folio3",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "Folio3",
    category: "Enterprise IT",
    location: "Karachi / Lahore / Islamabad / US",
    tier: "Digital Health, ERP, Mobile & AI Solutions",
    tagline:
      "Over 15+ years delivering enterprise digital health, livestock tech, and enterprise ERP solutions.",
    accentColor: "#0284C7",
    entryRoles: [
      "Associate Software Engineer",
      "Associate Mobile Developer",
      "AI / Python Associate",
    ],
    primaryStack: [
      "Flutter / React Native",
      "Node.js / Python",
      "Angular / React",
      "AWS",
      "MySQL / MongoDB",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Initial Resume & Portfolio Screening",
        "2. Technical Aptitude Test",
        "3. Technical Interview",
        "4. Management Interview",
      ],
      nonNegotiables: [
        {
          skill: "Demonstrable Mobile / Web Project with Clean State Architecture",
          whyRequired: "Client projects require production-level maintainability.",
          level: "Crucial",
        },
        {
          skill: "REST API Integration & Offline Caching",
          whyRequired:
            "Enterprise mobile apps must function seamlessly in low-connectivity environments.",
          level: "High Priority",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Lack of Production Deployment & App Store / Web Polish",
        whyCompanyRejects:
          "Candidates show unpolished apps with broken layouts, unhandled errors, and no offline handling.",
        whatCandidateDidWrong:
          "Did not handle loading states, network errors, or responsive layouts on mobile screens.",
        fixAction:
          "Add comprehensive error boundaries, loading skeletons, offline caching, and deploy live on Netlify/Vercel or Play Store APK.",
      },
    ],
    projectExpectation: {
      title: "Cross-Platform Field Operations App or Telehealth Portal",
      mustHaveFeatures: [
        "Offline-first caching (Hive/IndexedDB)",
        "Form validation with multi-step wizard",
        "Clean REST API backend integration",
      ],
      unacceptableClones: ["Simple calculator", "Default counter app"],
      recommendedTechStack: [
        "Flutter or React Native or Next.js",
        "Node.js / Express",
        "PostgreSQL",
        "Docker",
      ],
    },
    interviewPreparation: {
      dsaFocus: ["Arrays, Lists, Maps", "Recursion basics", "Basic sorting & searching"],
      coreTheory: [
        "State management lifecycles",
        "Database indexing & schema design",
        "Authentication best practices",
      ],
      behavioralKeys: ["Client communication readiness", "Teamwork and adaptability"],
    },
  },
  {
    id: "motive",
    name: "Motive (KeepTruckin)",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: { provider: "greenhouse", token: "gomotive" },
    shortName: "Motive",
    category: "High-Scale Tech",
    location: "Islamabad / Lahore / US",
    tier: "Silicon Valley Unicorn (IoT & High Scale)",
    tagline:
      "Transforming the physical economy with IoT, AI hardware, and massive scale distributed systems.",
    accentColor: "#10B981",
    entryRoles: [
      "Software Engineer 1",
      "Associate Backend Engineer",
      "Associate QA Automation Engineer",
    ],
    primaryStack: [
      "Go",
      "Python",
      "Ruby / Rails",
      "Node.js",
      "Kafka",
      "PostgreSQL",
      "Docker / Kubernetes",
    ],
    hiringBar: {
      evaluationStages: [
        "1. High Bar Resume Screening",
        "2. Algorithmic Coding Assessment (LeetCode Medium)",
        "3. Systems & Concurrency Technical Round",
        "4. Values & Culture Fit",
      ],
      nonNegotiables: [
        {
          skill: "Strong DSA & Algorithmic Foundations",
          whyRequired:
            "High scale IoT streams require optimal memory and time complexity algorithms.",
          level: "Crucial",
        },
        {
          skill: "Distributed Systems & Concurrency Concepts",
          whyRequired:
            "Systems handle millions of real-time GPS and telemetry packets every second.",
          level: "Crucial",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "Inability to Solve LeetCode Medium Algorithmic Problems",
        whyCompanyRejects:
          "Motive holds Silicon Valley engineering standards; failing the live algorithm round results in immediate rejection.",
        whatCandidateDidWrong:
          "Never practiced Graph traversals, Trees, Dynamic Programming, or Heap data structures.",
        fixAction:
          "Solve 100+ LeetCode Medium problems across Graphs, Trees, Heaps, and Dynamic Programming.",
      },
    ],
    projectExpectation: {
      title: "Real-Time Telemetry / IoT Event Ingestion Engine",
      mustHaveFeatures: [
        "High-throughput event queue (Kafka or RabbitMQ or Redis Streams)",
        "Worker pool with concurrent consumer processing",
        "PostgreSQL time-series table design",
      ],
      unacceptableClones: ["Basic CRUD App", "Simple Chat without message queue"],
      recommendedTechStack: [
        "Go or Node.js or Python",
        "Kafka / Redis Streams",
        "PostgreSQL / TimescaleDB",
        "Docker",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Graphs (Dijkstra, BFS, DFS)",
        "Heaps & Priority Queues",
        "Dynamic Programming & Trees",
      ],
      coreTheory: [
        "Distributed systems basics (CAP theorem, Eventual Consistency)",
        "Concurrency (Mutexes, Channels, Goroutines)",
        "Database Sharding & Replication",
      ],
      behavioralKeys: ["Ownership mindset", "Debugging complex distributed incidents"],
    },
  },
  {
    id: "global-tech",
    name: "Global Tech / US Remote Startups",
    sources: [],
    researchedOn: null,
    verified: false,
    atsBoard: null,
    shortName: "Global / Remote",
    category: "Global Tech",
    location: "Remote / US / Europe",
    tier: "High-Compensation Remote Roles ($2,000–$5,000+/mo)",
    tagline:
      "Silicon Valley, Y Combinator, and European remote tech companies hiring international talent.",
    accentColor: "#6366F1",
    entryRoles: ["Junior Software Engineer (Remote)", "Full Stack Developer", "Frontend Engineer"],
    primaryStack: [
      "TypeScript",
      "Next.js",
      "Node.js / Go / Python",
      "PostgreSQL",
      "AWS / Cloudflare",
      "Docker",
    ],
    hiringBar: {
      evaluationStages: [
        "1. Async Video / GitHub & Resume Deep Scan",
        "2. Paid Take-Home Assignment or Live Coding",
        "3. Technical Architecture & Product Sense Interview",
        "4. Founder / Team Fit",
      ],
      nonNegotiables: [
        {
          skill: "Flawless English Written & Async Communication",
          whyRequired:
            "Remote teams work across timezones and rely entirely on written documentation and PR descriptions.",
          level: "Crucial",
        },
        {
          skill: "Public High-Quality Open Source or Production Portfolio",
          whyRequired:
            "Remote companies only hire engineers who have proven autonomous shipping ability.",
          level: "Crucial",
        },
      ],
    },
    rejectionTruths: [
      {
        rank: 1,
        title: "No Public Proof of Autonomous Shipping",
        whyCompanyRejects:
          "Remote employers cannot micromanage juniors. If your GitHub doesn't show independent commits, PRs, and live apps, you are filtered out.",
        whatCandidateDidWrong:
          "Empty GitHub history, no deployed applications, no comprehensive documentation or video walkthroughs.",
        fixAction:
          "Ship a full product with public GitHub, comprehensive README with architectural diagrams, automated CI tests, and a 2-minute Loom demo video.",
      },
    ],
    projectExpectation: {
      title: "Production-Grade Developer Tool or SaaS with Video Demo",
      mustHaveFeatures: [
        "Comprehensive README with Architecture Diagram",
        "2-minute Loom video demo linked in README",
        "100% TypeScript with automated GitHub Actions tests",
        "Live deployed demo with OAuth sign-in",
      ],
      unacceptableClones: ["Any tutorial clone", "Undocumented code"],
      recommendedTechStack: [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "PostgreSQL",
        "Cloudflare / Vercel",
        "GitHub Actions",
      ],
    },
    interviewPreparation: {
      dsaFocus: [
        "Practical data structure manipulations",
        "Async concurrency",
        "Refactoring and code smells",
      ],
      coreTheory: [
        "Product sense & UX intuition",
        "API Design & Security",
        "Performance optimization (LCP, FID, Web Vitals)",
      ],
      behavioralKeys: ["Async communication mastery", "Extreme ownership and proactiveness"],
    },
  },
];

/**
 * Broader employer directory for discovery. Detailed hiring truths remain
 * curated above. Directory companies have NO researched hiring profile:
 * matchCompanyTruth returns null for them, and callers must show an honest
 * "not researched yet" state instead of inventing company specifics.
 */
export const PAKISTAN_COMPANY_DIRECTORY = [
  "Afiniti",
  "Avanza Solutions",
  "Bazaar Technologies",
  "Bykea",
  "Careem Pakistan",
  "Confiz",
  "Contour Software",
  "CureMD",
  "Daraz Pakistan",
  "Educative",
  "Elixir Technologies",
  "GeniTeam",
  "HBL Digital",
  "Jazz / VEON",
  "KalSoft",
  "LMKR",
  "MarketLytics",
  "Motive",
  "NayaPay",
  "NorthBay Solutions",
  "PakWheels",
  "Panacloud",
  "Pipe",
  "Rolustech",
  "S&P Global Pakistan",
  "Systems Limited",
  "Tkxel",
  "TPS Worldwide",
  "TRG Pakistan",
  "VentureDive",
  "VeriPark",
] as const;

/**
 * Match a user's target company string to a researched hiring truth profile.
 *
 * Returns null when the company has no researched profile. Callers must
 * handle null honestly ("not researched yet") — never invent hiring data
 * for an unknown company. A previous version of this function fabricated a
 * generic profile for any name; that branch was deleted on 2026-11-20.
 */
export function matchCompanyTruth(companyName?: string | null): CompanyHiringTruth | null {
  if (!companyName || !companyName.trim()) {
    return null;
  }

  const query = companyName.toLowerCase().trim();

  // Try exact and fuzzy matching against featured companies
  const found = FEATURED_COMPANIES.find((c) => {
    const idMatch = c.id.toLowerCase().includes(query) || query.includes(c.id.toLowerCase());
    const nameMatch = c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase());
    const shortMatch =
      c.shortName.toLowerCase().includes(query) || query.includes(c.shortName.toLowerCase());
    return idMatch || nameMatch || shortMatch;
  });

  // No researched profile for this company. Return null so callers can show
  // an honest "not researched yet" state instead of invented specifics.
  return found ?? null;
}
