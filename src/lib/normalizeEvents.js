// src/lib/normalizeEvents.js

// Helper: parse Google event start/end into Date objects (or all-day date)
function getEventBounds(ev) {
  const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : (ev.start?.date ? new Date(ev.start.date + "T00:00:00") : null);
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : (ev.end?.date ? new Date(ev.end.date + "T00:00:00") : null);

  const isAllDay = Boolean(ev.start?.date && ev.end?.date);
  return { start, end, isAllDay };
}

// All-day end dates are exclusive in Google Calendar.
// For spanning day calculations, treat end as end - 1 day for all-day.
// For timed events, we’ll bucket by local midnights.
function adjustEndForAllDay(end) {
  const d = new Date(end);
  d.setDate(d.getDate() - 1);
  return d;
}

function dateKeyLocal(d) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Returns segments suitable for a month-column/day-row grid:
// [{ calendarId, eventId, title, color, startKey, endKey, days: [dateKey...], ... }]
export function normalizeEventsByDay({ calendarId, calendarColor, events }) {
  const out = [];

  for (const ev of events || []) {
    const { start, end, isAllDay } = getEventBounds(ev);
    if (!start || !end) continue;

    let startDay = new Date(start);
    let endDay = new Date(end);

    if (isAllDay) {
      endDay = adjustEndForAllDay(endDay);
    } else {
      // For timed events, if it ends exactly at midnight, treat endDay as previous day for span purposes
      if (endDay.getHours() === 0 && endDay.getMinutes() === 0 && endDay.getSeconds() === 0) {
        endDay = addDays(endDay, -1);
      }
    }

    // Build a day list from startDay..endDay inclusive
    const days = [];
    let cursor = new Date(startDay);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(endDay);
    last.setHours(0, 0, 0, 0);

    while (cursor <= last) {
      days.push(dateKeyLocal(cursor));
      cursor = addDays(cursor, 1);
    }

    out.push({
      calendarId,
      calendarColor,
      eventId: ev.id,
      title: ev.summary || "(No title)",
      htmlLink: ev.htmlLink || null,
      isAllDay,
      startDateTime: ev.start?.dateTime || null,
      endDateTime: ev.end?.dateTime || null,
      startDate: ev.start?.date || null,
      endDate: ev.end?.date || null,
      startKey: dateKeyLocal(startDay),
      endKey: dateKeyLocal(endDay),
      days
    });
  }

  return out;
}
