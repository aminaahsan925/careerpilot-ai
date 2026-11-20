import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Bell,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  Flame,
  Globe2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  WifiOff,
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

interface TechEventsSectionProps {
  userCity?: string | undefined;
  targetRole?: string;
}

const EVENT_TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: Globe2 },
  { id: 'hackathon', label: 'Hackathons', icon: Flame, badge: '🔥' },
  { id: 'workshop', label: 'Workshops', icon: Wrench, badge: '🛠️' },
  { id: 'conference', label: 'Conferences', icon: Users, badge: '🎙️' },
  { id: 'meetup', label: 'Meetups', icon: Zap, badge: '🤝' },
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

export function TechEventsSection({ userCity, targetRole }: TechEventsSectionProps) {
  const initialCity = userCity?.trim() ? userCity : 'All Cities';
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Sample list only, and only events still in the future. Live data is
  // fetched on mount below; the page never renders a stale list as current.
  const [eventsList, setEventsList] = useState<TechEvent[]>(() => getUpcomingFallbackEvents());
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
      toast.success(`Reminder alert scheduled for "${event.title}"!`);
    } else {
      toast.info(`Reminder saved for "${event.title}". Ensure browser notifications are enabled.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Filter Controls ──────────────────────────── */}
      <div className="card-surface rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-terracotta">
                <Flame className="h-3 w-3" /> Tech Ecosystem
              </span>
              <span className="text-[11px] text-muted-foreground">
                • Competitions & Meetups
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Student Hackathons & Events
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
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
              className="rounded-xl border-border h-9 px-4 text-xs font-semibold hover:border-terracotta/40 hover:text-terracotta transition-all"
            >
              <RefreshCw
                className={cn('mr-1.5 h-3.5 w-3.5 text-terracotta', isRefreshing && 'animate-spin')}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="mt-6 pt-5 border-t border-border flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-semibold text-muted-foreground mr-1">
              City:
            </span>
            {CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-medium transition-all border',
                  selectedCity === city
                    ? 'border-terracotta bg-terracotta text-white font-semibold shadow-xs'
                    : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px] lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by name, topic, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs border-border bg-secondary/20 focus:bg-card"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {EVENT_TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedType(f.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all border',
                selectedType === f.id
                  ? 'border-foreground bg-foreground text-background font-semibold shadow-xs'
                  : 'border-border/70 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {f.badge && <span className="text-[11px]">{f.badge}</span>}
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
          ))}
        </div>
      </div>

      {/* ── Sample-data banner: never present samples as live listings ── */}
      {(showingSamples || liveFetchFailed) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <p className="text-[13px] font-semibold text-foreground">
            Showing sample events — live refresh failed
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
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
            const daysLeft = getDaysUntil(event.eventDate);
            const isPinned = pinnedEventIds.includes(event.id);
            const dateObj = new Date(event.eventDate);
            const monthStr = isNaN(dateObj.getTime())
              ? '2026'
              : dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
            const dayNum = isNaN(dateObj.getTime()) ? '28' : dateObj.getDate();

            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={cn(
                  'group rounded-2xl border transition-all hover:shadow-lift',
                  isPinned
                    ? 'border-terracotta/30 bg-terracotta/[0.04]'
                    : 'border-border/60 bg-secondary/30 hover:border-terracotta/25 hover:bg-secondary/50'
                )}
              >
                {/* ── Row Layout ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5">

                  {/* Date badge column */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-terracotta/20 bg-terracotta/10 px-3 py-2.5 text-terracotta min-w-[52px] shrink-0 shadow-2xs">
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
                            ? 'bg-amber-100 text-amber-800'
                            : event.eventType === 'workshop'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-secondary text-foreground'
                        )}
                      >
                        {event.eventType}
                      </span>
                      {event.isSample && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-800">
                          Sample
                        </span>
                      )}
                      {daysLeft > 0 && (
                        <span className="text-[10.5px] font-medium text-muted-foreground">
                          · in {daysLeft}d
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-[10.5px] text-muted-foreground">
                        <MapPin className="h-3 w-3 text-terracotta shrink-0" />
                        {event.city}
                      </span>
                      {event.prizePool && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-200/60">
                          <Award className="h-2.5 w-2.5" /> {event.prizePool}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-[14.5px] font-bold text-foreground leading-snug group-hover:text-terracotta transition-colors">
                      {event.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                      {event.description}
                    </p>

                    {/* Organizer + Venue row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground/70">Organizer:</span>{' '}
                        {event.organizer}
                      </span>
                      <span className="hidden sm:inline text-border">·</span>
                      <span>
                        <span className="font-semibold text-foreground/70">Venue:</span>{' '}
                        {event.venue}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {event.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Prep tips */}
                    <details className="rounded-xl border border-terracotta/15 bg-terracotta/[0.04] px-3 py-2">
                      <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-terracotta">
                        How to prepare for this {event.eventType}
                      </summary>
                      <ul className="mt-1.5 space-y-1 pl-4 text-[11px] leading-relaxed text-muted-foreground">
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
                <div className="flex items-center gap-2 border-t border-border/40 bg-secondary/20 px-4 py-3 rounded-b-2xl">
                  <Button
                    variant={isPinned ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleTogglePin(event)}
                    className={cn(
                      'flex-1 rounded-xl text-xs font-semibold h-8 transition-all',
                      isPinned
                        ? 'border-terracotta/40 bg-terracotta/10 text-terracotta hover:bg-terracotta/20'
                        : 'border-border/60 bg-card hover:border-terracotta/40 hover:text-terracotta'
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
                    onClick={() => handleRemindMe(event)}
                    className="h-8 w-8 rounded-xl border border-border/60 bg-card hover:border-terracotta/40 hover:text-terracotta text-muted-foreground"
                    title="Notify me / Set Reminder"
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </Button>

                  <a
                    href={event.registrationUrl || event.eventUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-terracotta px-3 text-xs font-semibold text-white transition-colors hover:bg-terracotta/90"
                    aria-label={`Register for ${event.title}`}
                  >
                    Register <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredEvents.length === 0 && (
        <div className="card-surface p-12 text-center rounded-3xl border-border">
          <Globe2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <h3 className="mt-3 font-display text-base font-bold text-foreground">
            {isRefreshing
              ? "Searching live events…"
              : hasFetchedLive && eventsList.length === 0
                ? `No upcoming events found for ${selectedCity}`
                : `No events found for ${selectedCity}`}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
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
