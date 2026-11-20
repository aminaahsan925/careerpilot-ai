import { getUpcomingFallbackEvents, type TechEvent } from "@/data/tech-events";
import { groqChat, parseJsonObject } from "./ai.server";
import { tavilySearch } from "./tavily.server";

type EventDraft = {
  city?: string;
  title?: string;
  eventType?: TechEvent["eventType"];
  organizer?: string;
  venue?: string;
  eventDate?: string;
  eventUrl?: string;
  registrationUrl?: string;
  description?: string;
  tags?: string[];
  prizePool?: string;
  preparationTips?: string[];
};

const EVENT_TYPES = new Set<TechEvent["eventType"]>([
  "hackathon",
  "workshop",
  "conference",
  "meetup",
]);

function fallbackEvents(city: string): TechEvent[] {
  // Sample list only, and only events still in the future. Past samples are
  // never shown as upcoming.
  return getUpcomingFallbackEvents().filter(
    (event) =>
      city === "All Cities" ||
      event.city.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(event.city.toLowerCase()),
  );
}

function normalizeEvents(city: string, drafts: EventDraft[]): TechEvent[] {
  return drafts
    .map((draft, index) => {
      const title = draft.title?.trim();
      const eventUrl = draft.eventUrl?.trim();
      const registrationUrl = draft.registrationUrl?.trim() || eventUrl;
      const eventDate = draft.eventDate?.trim();
      if (
        !title ||
        !eventUrl ||
        !registrationUrl ||
        !/^https?:\/\//i.test(eventUrl) ||
        !/^https?:\/\//i.test(registrationUrl) ||
        !eventDate
      ) return null;

      const eventType = EVENT_TYPES.has(draft.eventType ?? "meetup")
        ? draft.eventType!
        : "meetup";
      const eventCity = draft.city?.trim() || city;
      const cityMatches =
        city === "All Cities" ||
        eventCity.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(eventCity.toLowerCase());
      if (!cityMatches) return null;
      const tags = Array.isArray(draft.tags)
        ? draft.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
        : [];

      const event: TechEvent = {
        id: `live-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
        city: eventCity,
        title,
        eventType,
        organizer: draft.organizer?.trim() || "Organizer not listed",
        venue: draft.venue?.trim() || "See event page",
        eventDate,
        eventUrl,
        registrationUrl,
        description: draft.description?.trim() || "See the official event page for details.",
        tags,
        preparationTips: Array.isArray(draft.preparationTips)
          ? draft.preparationTips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 4)
          : [],
        ...(draft.prizePool?.trim() ? { prizePool: draft.prizePool.trim() } : {}),
        isVerified: true,
        registrationOpen: true,
        isAiGrounded: true,
      };
      return event;
    })
    .filter((event): event is TechEvent => Boolean(event));
}

/** Search the live web on the server, then use the configured AI failover chain
 * (Groq -> Gemini -> OpenRouter) to turn search evidence into safe event cards. */
export async function getLiveTechEvents(city: string, targetRole?: string): Promise<TechEvent[]> {
  const cleanCity = city.trim() || "Lahore";
  // "All Cities" is a filter, not a place: search Pakistan-wide instead of
  // asking the web for events "in All Cities".
  const queryCity = cleanCity === "All Cities" ? "Pakistan" : cleanCity;
  const query = [
    `upcoming developer hackathons conferences workshops meetups in ${queryCity}, Pakistan only`,
    "official registration 2026 2027",
    targetRole ? `relevant to ${targetRole}` : "students and early-career developers",
  ].join(" ");

  try {
    const search = await tavilySearch(query, { maxResults: 8, searchDepth: "advanced" });
    if (!search.results.length) return fallbackEvents(cleanCity);

    const evidence = search.results
      .map(
        (result, index) =>
          `[${index + 1}] ${result.title}\nURL: ${result.url}\nPublished: ${result.publishedDate ?? "unknown"}\n${result.content.slice(0, 1800)}`,
      )
      .join("\n\n");

    const scopeInstruction =
      cleanCity === "All Cities"
        ? "Find events happening anywhere in Pakistan from this evidence."
        : `Find only events physically happening in ${cleanCity}, Pakistan from this evidence. Exclude events from other cities and nationwide listings unless they explicitly have a ${cleanCity} venue or city-specific date.`;

    const raw = await groqChat(
      [
        {
          role: "system",
          content:
            "You extract only real events from web evidence. Never invent dates, URLs, organizers, or venues. Return JSON only in the shape {\"events\":[]}. Include an event only when the evidence contains a plausible official page URL and date.",
        },
        {
          role: "user",
          content: `${scopeInstruction} Return at most 8 events with keys city, title, eventType, organizer, venue, eventDate (YYYY-MM-DD), eventUrl, registrationUrl, description, tags, prizePool, preparationTips. For preparationTips, give 3 concise, event-specific actions based on the event format, title, tags, and description. Do not give generic advice that ignores the event.\n\n${evidence}`,
        },
      ],
      { json: true, maxTokens: 2200, temperature: 0.1, totalTimeoutMs: 28_000 },
    );

    const parsed = parseJsonObject<{ events?: EventDraft[] }>(raw);
    const events = normalizeEvents(cleanCity, parsed.events ?? []);
    return events.length ? events : fallbackEvents(cleanCity);
  } catch (error) {
    console.warn("[TechEvents] live search failed; using cached events", {
      city: cleanCity,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackEvents(cleanCity);
  }
}
