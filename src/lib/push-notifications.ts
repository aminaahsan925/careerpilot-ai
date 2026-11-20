// Local event pins + immediate local reminders.
//
// NOTE (2026-11-20 rebuild): CareerPilot has NO push notification system.
// The old push facade was removed: there is no service-worker registration,
// no push subscription, and no "subscribed" localStorage flag — the
// previous toggle claimed users would receive daily updates "even when
// closed", which was false. What remains here is honest and local:
//   - pinned events (localStorage only, shown on the Roadmap page), and
//   - an immediate local notification shown the moment the user taps a
//     reminder button (plain `Notification`, no service worker, nothing
//     scheduled, nothing sent later).
// In-app notifications are separate and real: roadmap_notifications rows
// rendered by NotificationBell.

const PINNED_EVENTS_KEY = 'careerpilot_pinned_events';

// Pinned Flight Plan Events
export interface PinnedEvent {
  id: string;
  title: string;
  city: string;
  eventDate: string;
  eventType: string;
  organizer: string;
  eventUrl: string;
  addedAt: string;
}

export function getPinnedEvents(): PinnedEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PINNED_EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function togglePinEvent(event: Omit<PinnedEvent, 'addedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  const current = getPinnedEvents();
  const exists = current.some((e) => e.id === event.id);

  if (exists) {
    const updated = current.filter((e) => e.id !== event.id);
    localStorage.setItem(PINNED_EVENTS_KEY, JSON.stringify(updated));
    return false; // unpinned
  } else {
    const updated = [
      ...current,
      {
        ...event,
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(PINNED_EVENTS_KEY, JSON.stringify(updated));
    return true; // pinned
  }
}

/**
 * Show an immediate local reminder notification for a pinned event.
 * Nothing is scheduled: the notification appears now, in this session.
 * Returns true when the notification was shown, false otherwise
 * (unsupported browser, or permission denied).
 */
export async function sendEventReminderNotification(
  event: Pick<PinnedEvent, "title" | "organizer" | "city" | "eventDate">,
  daysLeft?: number,
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  try {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
    }
    const timeText = daysLeft && daysLeft > 0 ? `in ${daysLeft} days` : "happening soon";
    new Notification(`Reminder: ${event.title}`, {
      body: `${event.title} in ${event.city} by ${event.organizer} is ${timeText}. Check requirements & prep!`,
      icon: '/favicon.ico',
    });
    return true;
  } catch (error) {
    console.warn('[CareerPilot] Local reminder notification failed:', error);
    return false;
  }
}
