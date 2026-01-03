// src/lib/googleApi.js

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

async function gFetch(token, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Google API error ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return await res.json();
}

export async function apiFetchCalendarList(token) {
  // Gets user's calendars with colors if present
  const url = new URL(`${GCAL_BASE}/users/me/calendarList`);
  url.searchParams.set("maxResults", "250");
  return await gFetch(token, url.toString());
}

function yearRange(year) {
  // Local timezone is handled by Google if we provide ISO date-time with Z?
  // We'll use UTC boundaries for the year; normalization will bucket by local time later.
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export async function apiFetchEventsForYear(token, { year, calendarIds }) {
  const { timeMin, timeMax } = yearRange(year);

  const results = {};
  await Promise.all(
    (calendarIds || []).map(async (calendarId) => {
      const url = new URL(`${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true"); // expand recurring
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "2500"); // large, but bounded
      // TODO: pagination if needed via pageToken
      const data = await gFetch(token, url.toString());
      results[calendarId] = data;
    })
  );

  return results;
}
