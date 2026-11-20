/**
 * Tech Events & Hackathons, Round 3 (Cursor as Flashlight / Lens).
 *
 * Signature moment: every event card is a SpotlightCard whose border
 * glow follows the cursor, and the date badge and prize chip drift at
 * different depths under the pointer (the MarketLens parallax pattern:
 * pointer state plus a CSS transition, no second engine). Content stays
 * fully readable at rest; with reduced motion there is no parallax and
 * no glow tracking.
 *
 * Presentation only: the live fetch, filters, pinning and reminders are
 * unchanged. Sample events stay labelled as samples, never presented as
 * live listings.
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Bell,
  Calendar,
  Check,
  ExternalLink,
  Flame,
  Globe2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CITIES,
  getUpcomingFallbackEvents,
  getDaysUntil,
  type TechEvent,
} from '@/data/tech-events';
import { getLiveTechEvents } from '@/lib/tech-events.functions';
import {
  getPinnedEvents,
  togglePinEvent,
  sendEventReminderNotification,
} from '@/lib/push-notifications';
import { cn } from '@/lib/utils';
import { SpotlightCard } from '@/components/lens/SpotlightCard';
import { usePrefersReducedMotion } from '@/components/lens/usePrefersReducedMotion';

interface TechEventsSectionProps {
  userCity?: string | undefined;
  targetRole?: string;
}

const EVENT_TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: Globe2 },
  { id: 'hackathon', label: 'Hackathons', icon: Flame },
  { id: 'workshop', label: 'Workshops', icon: Wrench },
  { id: 'conference', label: 'Conferences', icon: Users },
  { id: 'meetup', label: 'Meetups', icon: Zap },
];

function preparationTipsFor(event: TechEvent): string[] {
  if (event.preparationTips?.length) return event.preparationTips;
  const focus = event.tags.slice(0, 2).join(' and ') || 'the event topics';
  if (event.eventType === 'hackathon') {
    return [
      `Read the rules and judging criteria, then choose a small ${focus} idea.`,
      'Prepare a short pitch, demo path, and a backup plan for the final presentation.',
      'Set up your repository, starter stack, and team roles before the event begins.',
    ];
  }
  if (event.eventType === 'workshop') {
    return [
      `Review the basics behind ${focus} before attending.`,
      'Bring a working laptop and recreate the speaker’s setup in a small practice project.',
      'Write down one question and one follow-up experiment to complete afterward.',
    ];
  }
  return [
    `Scan the agenda and pick one session connected to ${focus}.`,
    'Prepare a one-sentence introduction and two thoughtful questions.',
    'Save the speakers, projects, and follow-up resources you want to explore.',
  ];
}

/**
 * One event card's body: the parallax layers live here (the date badge
 * drifts with the pointer, the prize chip drifts against it), inside
 * the SpotlightCard that owns the border glow. Pointer state follows
 * the MarketLens pattern; reduced motion gets no parallax at all.
 */
function EventCardBody({
  event,
  isPinned,
  onTogglePin,
  onRemindMe,
}: {
  event: TechEvent;
  isPinned: boolean;
  onTogglePin: (event: TechEvent) => void;
  onRemindMe: (event: TechEvent) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const daysLeft = getDaysUntil(event.eventDate);
  const dateObj = new Date(event.eventDate);
  const monthStr = isNaN(dateObj.getTime())
    ? '2026'
    : dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
  const dayNum = isNaN(dateObj.getTime()) ? '28' : dateObj.getDate();

  function updatePointer(clientX: number, clientY: number) {
    const el = bodyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPointer({
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    });
  }

  // Parallax depths: the date badge rides with the pointer, the prize
  // chip drifts against it. Both stay small so nothing ever overlaps
  // the text next to them.
  const badgeShift = pointer && !reduced
    ? { transform: `translate(${(pointer.x - 50) * 0.24}px, ${(pointer.y - 50) * 0.16}px)` }
    : undefined;
  const prizeShift = pointer && !reduced
    ? { transform: `translate(${(pointer.x - 50) * -0.16}px, ${(pointer.y - 50) * -0.12}px)` }
    : undefined;

  return (
    <div
      ref={bodyRef}
      onPointerMove={(e) => {
        if (reduced) return;
        updatePointer(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        if (reduced) return;
        updatePointer(e.clientX, e.clientY);
      }}
      onPointerLeave={() => setPointer(null)}
    >
      {/* ── Row Layout ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5">

        {/* Date badge column (parallax layer, drifts with the pointer) */}
        <div
          style={badgeShift}
          className="flex flex-col items-center justify-center rounded-2xl border border-cp-lime/25 bg-cp-lime/10 px-3 py-2.5 text-cp-lime min-w-[52px] shrink-0 transition-transform duration-300 ease-out will-change-transform"
        >
          <span className="text-[9px] font-extrabold uppercase tracking-widest leading-tight">
            {monthStr}
          </span>
          <span className="font-display text-xl font-bold leading-tight">
            {dayNum}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
                event.eventType === 'hackathon'
                  ? 'bg-amber-500/15 text-amber-300'
                  : event.eventType === 'workshop'
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'bg-white/5 text-cp-paper'
              )}
            >
              {event.eventType}
            </span>
            {event.isSample && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-300">
                Sample
              </span>
            )}
            {daysLeft > 0 && (
              <span className="font-mono text-[10.5px] font-medium text-cp-stone">
                · in {daysLeft}d
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[10.5px] text-cp-stone">
              <MapPin className="h-3 w-3 text-cp-lime shrink-0" />
              {event.city}
            </span>
            {event.prizePool && (
              <span
                style={prizeShift}
                className="flex items-center gap-1 rounded-full bg-cp-lime/10 px-2 py-0.5 text-[9.5px] font-bold text-cp-lime border border-cp-lime/25 transition-transform duration-300 ease-out will-change-transform"
              >
                <Award className="h-2.5 w-2.5" /> {event.prizePool}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display text-[15px] font-bold text-cp-paper leading-snug group-hover:text-cp-lime transition-colors">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-[12px] text-cp-stone leading-relaxed line-clamp-2">
            {event.description}
          </p>

          {/* Organizer + Venue row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-cp-stone">
            <span>
              <span className="font-semibold text-cp-paper/70">Organizer:</span>{' '}
              {event.organizer}
            </span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span>
              <span className="font-semibold text-cp-paper/70">Venue:</span>{' '}
              {event.venue}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-medium text-cp-stone"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Prep tips */}
          <details className="rounded-2xl border border-cp-lime/15 bg-cp-lime/[0.04] px-3 py-2">
            <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-cp-lime">
              How to prepare for this {event.eventType}
            </summary>
            <ul className="mt-1.5 space-y-1 pl-4 text-[11px] leading-relaxed text-cp-stone">
              {preparationTipsFor(event).map((tip) => (
                <li key={tip} className="list-disc">
                  {tip}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      {/* ── Actions bar ────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] px-4 py-3 rounded-b-3xl">
        <Button
          variant={isPinned ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onTogglePin(event)}
          className={cn(
            'flex-1 rounded-xl text-xs font-semibold h-8 transition-all',
            isPinned
              ? 'border-cp-lime/40 bg-cp-lime/10 text-cp-lime hover:bg-cp-lime/20'
              : 'border-white/10 bg-cp-ink hover:border-cp-lime/40 hover:text-cp-lime'
          )}
        >
          <span className="inline-flex items-center">
            {isPinned ? (
              <><Check className="mr-1.5 h-3.5 w-3.5" /> Added to Roadmap</>
            ) : (
              <><Plus className="mr-1.5 h-3.5 w-3.5" /> Add to Roadmap</>
            )}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemindMe(event)}
          className="h-8 w-8 rounded-xl border border-white/10 bg-cp-ink hover:border-cp-lime/40 hover:text-cp-lime text-cp-stone"
          title="Notify me / Set Reminder"
        >
          <Bell className="h-3.5 w-3.5" />
        </Button>

        <a
          href={event.registrationUrl || event.eventUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-cp-lime px-3 text-xs font-semibold text-cp-ink transition-colors hover:bg-cp-lime/90"
          aria-label={`Register for ${event.title}`}
        >
          Register <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export function TechEventsSection({ userCity, targetRole }: TechEventsSectionProps) {
  const initialCity = userCity?.trim() ? userCity : 'All Cities';
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Sample list only, and only events still in the future. Live data is
  // fetched on mount below; the page never renders a stale list as current.
  const [eventsList, setEventsList] = useState<TechEvent[]>(() =>
    getUpcomingFallbackEvents()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetchedLive, setHasFetchedLive] = useState(false);
  const [liveFetchFailed, setLiveFetchFailed] = useState(false);
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>(() =>
    getPinnedEvents().map((e) => e.id)
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchLiveEvents = useCallback(
    async (city: string): Promise<boolean> => {
      setIsRefreshing(true);
      try {
        const live = await getLiveTechEvents({
          data: { city, ...(targetRole ? { targetRole } : {}) },
        });
        if (!mountedRef.current) return true;
        setEventsList(live);
        setLiveFetchFailed(false);
        return true;
      } catch {
        if (mountedRef.current) setLiveFetchFailed(true);
        return false;
      } finally {
        if (mountedRef.current) {
          setIsRefreshing(false);
          setHasFetchedLive(true);
        }
      }
    },
    [targetRole],
  );

  // Fetch live events on mount instead of showing the sample list until a
  // manual refresh.
  const initialCityRef = useRef(initialCity);
  useEffect(() => {
    void fetchLiveEvents(initialCityRef.current);
  }, [fetchLiveEvents]);

  // True when every visible event is an unverified sample (live research
  // failed server-side and fell back to the sample list).
  const showingSamples =
    eventsList.length > 0 && eventsList.every((event) => event.isSample);

  // Filter events cleanly
  const filteredEvents = useMemo(() => {
    return eventsList.filter((event) => {
      const matchCity =
        selectedCity === 'All Cities' ||
        event.city.toLowerCase().includes(selectedCity.toLowerCase()) ||
        selectedCity.toLowerCase().includes(event.city.toLowerCase());

      const matchType = selectedType === 'all' || event.eventType === selectedType;

      const matchSearch =
        !searchQuery.trim() ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCity && matchType && matchSearch;
    });
  }, [eventsList, selectedCity, selectedType, searchQuery]);

  const handleRefresh = async () => {
    const ok = await fetchLiveEvents(selectedCity);
    if (ok) {
      toast.success(`Events refreshed for ${selectedCity}!`);
    } else {
      toast.error('Could not refresh events.');
    }
  };

  const handleTogglePin = (event: TechEvent) => {
    const isPinned = togglePinEvent({
      id: event.id,
      title: event.title,
      city: event.city,
      eventDate: event.eventDate,
      eventType: event.eventType,
      organizer: event.organizer,
      eventUrl: event.eventUrl,
    });

    if (isPinned) {
      setPinnedEventIds((prev) => [...prev, event.id]);
      toast.success(`"${event.title}" added to your Career Roadmap!`);
    } else {
      setPinnedEventIds((prev) => prev.filter((id) => id !== event.id));
      toast.info(`"${event.title}" removed from your Roadmap.`);
    }
  };

  const handleRemindMe = async (event: TechEvent) => {
    const daysLeft = getDaysUntil(event.eventDate);
    const sent = await sendEventReminderNotification(
      {
        title: event.title,
        organizer: event.organizer,
        city: event.city,
        eventDate: event.eventDate,
      },
      daysLeft
    );

    if (sent) {
      toast.success(`Reminder shown for "${event.title}".`);
    } else {
      toast.info(`Could not show a reminder for "${event.title}". Allow browser notifications and try again.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Filter Controls ──────────────────────────── */}
      <SpotlightCard className="rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-cp-lime/30 bg-cp-lime/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cp-lime">
                <Flame className="h-3 w-3" /> Tech Ecosystem
              </span>
              <span className="font-mono text-[11px] text-cp-stone">
                · Competitions &amp; Meetups
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-cp-paper sm:text-3xl">
              Student Hackathons &amp; Events
            </h2>
            <p className="text-xs text-cp-stone leading-relaxed max-w-xl">
              Explore regional hackathons and conferences. Add them as targeted milestones in your
              Career Roadmap.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="rounded-xl border-white/10 bg-cp-ink h-9 px-4 text-xs font-semibold hover:border-cp-lime/40 hover:text-cp-lime transition-all"
            >
              <RefreshCw
                className={cn('mr-1.5 h-3.5 w-3.5 text-cp-lime', isRefreshing && 'animate-spin')}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10.5px] font-medium text-cp-stone mr-1">
              City:
            </span>
            {CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={cn(
                  'rounded-full px-3 py-1.5 font-mono text-[11.5px] font-medium transition-all border',
                  selectedCity === city
                    ? 'border-cp-lime bg-cp-lime text-cp-ink font-semibold'
                    : 'border-white/10 bg-white/[0.02] text-cp-stone hover:bg-white/5 hover:text-cp-paper'
                )}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px] lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cp-stone" />
            <Input
              type="text"
              placeholder="Filter by name, topic, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs border-white/10 bg-cp-ink text-cp-paper placeholder:text-cp-stone/60 focus:border-cp-lime/60"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {EVENT_TYPE_FILTERS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedType(f.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11.5px] transition-all border',
                  selectedType === f.id
                    ? 'border-cp-paper bg-cp-paper text-cp-ink font-semibold'
                    : 'border-white/10 bg-cp-ink text-cp-stone hover:bg-white/5 hover:text-cp-paper'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{f.label}</span>
                <span className="text-[10px] opacity-70">
                  (
                  {
                    eventsList.filter((e) => {
                      const matchCity =
                        selectedCity === 'All Cities' ||
                        e.city.toLowerCase().includes(selectedCity.toLowerCase());
                      const matchType = f.id === 'all' || e.eventType === f.id;
                      return matchCity && matchType;
                    }).length
                  }
                  )
                </span>
              </button>
            );
          })}
        </div>
      </SpotlightCard>

      {/* ── Sample-data banner: never present samples as live listings ── */}
      {(showingSamples || liveFetchFailed) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <p className="text-[13px] font-semibold text-cp-paper">
            Showing sample events. Live refresh failed.
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-cp-stone">
            {showingSamples
              ? "These are unverified example events, not confirmed live listings. Check the organizer's page before planning around one."
              : "Live event research is unavailable right now. Try refreshing again shortly."}
          </p>
        </div>
      )}

      {/* ── Events Grid ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => {
            const isPinned = pinnedEventIds.includes(event.id);

            return (
              <motion.div
                key={event.id}
                layout
                data-proof={index === 0 ? "event-card-0" : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="group"
              >
                <SpotlightCard
                  className={cn(
                    'overflow-hidden rounded-3xl border transition-all',
                    isPinned
                      ? 'border-cp-lime/30 bg-cp-lime/[0.04]'
                      : 'border-white/10 bg-cp-panel hover:border-cp-lime/25'
                  )}
                >
                  <EventCardBody
                    event={event}
                    isPinned={isPinned}
                    onTogglePin={handleTogglePin}
                    onRemindMe={handleRemindMe}
                  />
                </SpotlightCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredEvents.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-cp-panel p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-cp-stone/40" />
          <h3 className="mt-3 font-display text-base font-bold text-cp-paper">
            {isRefreshing
              ? "Searching live events…"
              : hasFetchedLive && eventsList.length === 0
                ? `No upcoming events found for ${selectedCity}`
                : `No events found for ${selectedCity}`}
          </h3>
          <p className="mt-1 text-xs text-cp-stone">
            {isRefreshing
              ? "Checking the live web for hackathons, workshops, and conferences."
              : hasFetchedLive && eventsList.length === 0
                ? "Live refresh found nothing upcoming yet. Try another city or refresh again later."
                : "Try switching the city or resetting your filters."}
          </p>
        </div>
      )}
    </div>
  );
}
