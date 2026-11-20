// Tech Events & Hackathons Data Service with Gemini Search Grounding

export interface TechEvent {
  id: string;
  city: string;
  title: string;
  eventType: 'hackathon' | 'workshop' | 'conference' | 'meetup';
  organizer: string;
  venue: string;
  eventDate: string; // YYYY-MM-DD or readable string
  daysUntil?: number;
  eventUrl: string;
  registrationUrl?: string;
  description: string;
  tags: string[];
  preparationTips?: string[];
  isVerified: boolean;
  registrationOpen: boolean;
  prizePool?: string;
  isAiGrounded?: boolean;
  /** True for the hardcoded sample list: unverified example events, never presented as live listings. */
  isSample?: boolean;
}

// Sample events used only when live event research fails. They are
// unverified examples (isVerified: false) and must always be date-filtered
// through getUpcomingFallbackEvents() so past events are never shown.
export const INITIAL_TECH_EVENTS: TechEvent[] = [
  // Lahore
  {
    id: 'lhr-hck-1',
    city: 'Lahore',
    title: 'FAST National Solutions Hackathon 2026',
    eventType: 'hackathon',
    organizer: 'FAST-NUCES Lahore ACM Chapter',
    venue: 'FAST CFD & Lahore Campus',
    eventDate: '2026-09-28',
    eventUrl: 'https://fast.edu.pk/hackathons',
    description: '48-hour national hackathon focused on Generative AI pipelines, Distributed Systems, and FinTech integrations.',
    tags: ['AI/ML', 'FullStack', 'Prize: PKR 500k'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
    prizePool: 'PKR 500,000',
  },
  {
    id: 'lhr-wrk-2',
    city: 'Lahore',
    title: 'Production Agentic Workflows with Gemini & LangGraph',
    eventType: 'workshop',
    organizer: 'Google Developer Group (GDG) Lahore',
    venue: 'Arfa Software Technology Park, Level 3',
    eventDate: '2026-10-05',
    eventUrl: 'https://gdg.community.dev/gdg-lahore',
    description: 'Hands-on live engineering workshop building multi-agent systems, tool calling, and MCP server bridges.',
    tags: ['GenAI', 'Python', 'Agents'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },
  {
    id: 'lhr-conf-3',
    city: 'Lahore',
    title: 'Pakistan Cloud & DevOps Summit 2026',
    eventType: 'conference',
    organizer: 'Cloud Native Pakistan & AWS Community',
    venue: 'Faletti’s Grand Hall, Lahore',
    eventDate: '2026-10-20',
    eventUrl: 'https://devops.pk',
    description: 'Keynotes from principal architects on Kubernetes orchestration, Serverless patterns, and CI/CD security.',
    tags: ['DevOps', 'Kubernetes', 'Cloud'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },
  {
    id: 'lhr-mtp-4',
    city: 'Lahore',
    title: 'Lahore React & TypeScript Engineers Meetup',
    eventType: 'meetup',
    organizer: 'React Pakistan Community',
    venue: 'Daikin Co-Working Space, Gulberg III',
    eventDate: '2026-09-22',
    eventUrl: 'https://meetup.com/react-lahore',
    description: 'Technical deep-dive on React 19 Compiler, Server Components, and TanStack Router architectures.',
    tags: ['React', 'TypeScript', 'Frontend'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },

  // Karachi
  {
    id: 'khi-hck-1',
    city: 'Karachi',
    title: 'IBA FinTech & Web3 Hackathon 2026',
    eventType: 'hackathon',
    organizer: 'IBA Karachi Computer Science Society',
    venue: 'IBA Main Campus, University Road',
    eventDate: '2026-09-30',
    eventUrl: 'https://iba.edu.pk',
    description: 'Build real-time payment rails, open banking APIs, and decentralized identity solutions with industry mentors.',
    tags: ['FinTech', 'APIs', 'Prize: PKR 400k'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
    prizePool: 'PKR 400,000',
  },
  {
    id: 'khi-conf-2',
    city: 'Karachi',
    title: 'Karachi Tech Summit & Job Fair 2026',
    eventType: 'conference',
    organizer: 'P@SHA & Karachi Tech Hub',
    venue: 'Karachi Expo Centre, Hall 4',
    eventDate: '2026-10-15',
    eventUrl: 'https://pasha.org.pk',
    description: 'Over 80+ tech companies conducting instant technical interviews, code challenges, and networking for graduates.',
    tags: ['Hiring', 'Networking', 'Careers'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },
  {
    id: 'khi-wrk-3',
    city: 'Karachi',
    title: 'Scalable Backend Systems & Postgres Internals',
    eventType: 'workshop',
    organizer: 'Karachi Software Guild',
    venue: '10Pearls University, Clifton',
    eventDate: '2026-10-02',
    eventUrl: 'https://10pearls.com/university',
    description: 'Master indexing, query execution plans, connection pooling, and replication in high-throughput architectures.',
    tags: ['PostgreSQL', 'Databases', 'Backend'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },

  // Islamabad / Rawalpindi
  {
    id: 'isb-hck-1',
    city: 'Islamabad / Rawalpindi',
    title: 'NUST AI & Autonomous Systems Hackathon',
    eventType: 'hackathon',
    organizer: 'NUST SEECS & AI Club',
    venue: 'NUST H-12 Campus, Islamabad',
    eventDate: '2026-10-12',
    eventUrl: 'https://seecs.nust.edu.pk',
    description: 'Develop vision AI, autonomous drone navigators, and conversational clinical assistants over a 36-hour sprint.',
    tags: ['ComputerVision', 'Robotics', 'Prize: PKR 600k'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
    prizePool: 'PKR 600,000',
  },
  {
    id: 'isb-conf-2',
    city: 'Islamabad / Rawalpindi',
    title: 'National Cyber Security & Cloud Defense Conference',
    eventType: 'conference',
    organizer: 'National Centre for Cyber Security (NCCS)',
    venue: 'Pak-China Friendship Centre, Islamabad',
    eventDate: '2026-11-04',
    eventUrl: 'https://nccs.pk',
    description: 'Zero-trust architecture, threat simulation, and AI red-teaming with international defense researchers.',
    tags: ['Security', 'Infra', 'ZeroTrust'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },

  // Peshawar
  {
    id: 'psh-hck-1',
    city: 'Peshawar',
    title: 'KP Tech Sprint & EdTech Hackathon 2026',
    eventType: 'hackathon',
    organizer: 'KP Information Technology Board (KPITB)',
    venue: 'Durshal Tech Hub, Peshawar',
    eventDate: '2026-10-18',
    eventUrl: 'https://kpitb.gov.pk',
    description: 'Solving regional education and digital health challenges using edge computing and mobile technologies.',
    tags: ['KPITB', 'Mobile', 'Prize: PKR 350k'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
    prizePool: 'PKR 350,000',
  },

  // Faisalabad
  {
    id: 'fsd-wrk-1',
    city: 'Faisalabad',
    title: 'Next.js & Full-Stack Cloud Architecture BootCamp',
    eventType: 'workshop',
    organizer: 'FAST CFD Tech Guild',
    venue: 'FAST CFD Auditorium, Faisalabad',
    eventDate: '2026-10-08',
    eventUrl: 'https://cfd.fast.edu.pk',
    description: 'End-to-end fullstack deployment with Server Actions, Supabase, Vector Embeddings, and Vercel edge runtime.',
    tags: ['Next.js', 'Cloud', 'FullStack'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
  },

  // Remote / Virtual
  {
    id: 'rem-hck-1',
    city: 'Remote / Virtual',
    title: 'Global Autonomous Agentic Hackathon 2026',
    eventType: 'hackathon',
    organizer: 'Global AI Alliance',
    venue: 'Online / Discord & GitHub Classroom',
    eventDate: '2026-09-26',
    eventUrl: 'https://devpost.com',
    description: 'Build production autonomous assistants and automated code generation systems. Open to all Pakistani students.',
    tags: ['Global', 'AI Agents', 'Prize: $10,000 USD'],
    isVerified: false,
    registrationOpen: false,
    isSample: true,
    prizePool: '$10,000 USD',
  },
];

export const CITIES = [
  'All Cities',
  'Lahore',
  'Karachi',
  'Islamabad / Rawalpindi',
  'Peshawar',
  'Faisalabad',
  'Remote / Virtual',
];

// Helper to calculate days until event
export function getDaysUntil(dateString: string): number {
  try {
    const target = new Date(dateString).getTime();
    const today = new Date().getTime();
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

/** True when the event date is today or in the future. Unparseable dates are treated as past. */
export function isUpcomingEvent(event: TechEvent, now: Date = new Date()): boolean {
  const target = new Date(event.eventDate);
  if (Number.isNaN(target.getTime())) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return target.getTime() >= startOfToday;
}

/**
 * The sample fallback list, filtered to upcoming events only. Past sample
 * events must never be shown as verified, open, or upcoming.
 */
export function getUpcomingFallbackEvents(now: Date = new Date()): TechEvent[] {
  return INITIAL_TECH_EVENTS.filter((event) => isUpcomingEvent(event, now));
}
