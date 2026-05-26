import { toSGT, groupByDay } from "./utils.js";
import { getAccessToken } from "./oauth.js";

// Fetch events from a single calendar
async function fetchCalendar(calendarId, accessToken, timeMin, timeMax) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  if (!data.items) return [];

  return data.items
    .filter((e) => e.summary?.trim().length > 0)
    .map((e) => {
      const start = e.start?.dateTime || e.start?.date;
      const end = e.end?.dateTime || e.end?.date;

      return {
        title: e.summary,
        start_sgt: toSGT(start),
        end_sgt: toSGT(end),
        all_day: !!e.start?.date,
        calendar:
          calendarId === "primary"
            ? "primary"
            : "singapore-holidays",
      };
    });
}

// Fetch events from both work & personal accounts, merge them
export async function getGroupedEventsSGT(env) {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch both tokens concurrently
  const [workToken, personalToken] = await Promise.all([
    getAccessToken(env, "work"),
    getAccessToken(env, "personal"),
  ]);

  const calendars = [
    { token: workToken, id: "primary" }, // work primary calendar
    { token: personalToken, id: "primary" }, // personal primary calendar
    { token: workToken, id: "en.singapore%23holiday@group.v.calendar.google.com" }, // SG holidays
  ];

  // Fetch all calendars concurrently
  const allEvents = await Promise.all(
    calendars.map((c) => fetchCalendar(c.id, c.token, timeMin, timeMax))
  );

  const combined = allEvents.flat();
  combined.sort((a, b) => new Date(a.start_sgt) - new Date(b.start_sgt));

  const grouped = groupByDay(combined);

  return grouped;
}

// Format grouped events for the AI prompt
export function formatCalendarForPrompt(calendarData) {
  if (!calendarData) return "  • No events";

  return Object.entries(calendarData)
    .map(([date, events]) => {
      const eventText = events
        .map((e) => `    • ${e.start_sgt} - ${e.title}`)
        .join("\n");
      return `  ${date}:\n${eventText}`;
    })
    .join("\n");
}
