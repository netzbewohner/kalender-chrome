# AGENTS.md — Kalender (Chrome Extension)

## Mission
Build a Chrome Extension named **"Kalender"** that integrates with **Google Calendar** and displays the user's events in a **12-month column layout** with the goal to provide the users a general overview of the whole year:
- Each **month is a column** (Jan–Dec) shown simultaneously.
- Each **day of the month is a separate row** (1..31). (Months with fewer days show empty rows for missing days.)
- Events appear in the cell for their month/day.
- **Multi-day events span multiple rows** within the same month column (and across months if needed).

Primary goals:
1. Simple, reliable authentication to Google.
2. Correct event rendering (including all-day + timed + recurring + multi-day).
3. Multiple calendars with distinct colors and a clear UI.
4. Functionality to select year

---

## Product Requirements

### Core Features (Must Have)
1. **Google auth + event read**
   - Authenticate user and fetch events from Google Calendar API.
   - Use Chrome extension best-practice auth: **chrome.identity OAuth2**.
   - Request minimum scopes needed: read-only calendar data.

2. **12-month grid view**
   - One view showing 12 columns (months).
   - Provide horizontal scroll to reach months that do not fit on screen.
   - Offer a transpose option so months can render as rows and days as columns.
   - In transposed view, day columns are wider, labels sit on top, and row height adapts to overlapping events.
   - Rows represent day numbers 1..31 per month, with weekday abbreviations (Mo..Su) in each cell on the same line.
   - Weekend cells (Sa/Su) are shaded.
   - For each month column:
     - For invalid days (e.g., Feb 30), keep row but leave blank/disabled.
   - Sticky month headers recommended.

3. **Multiple calendars**
   - List user’s calendars.
   - Allow selecting multiple calendars to display at once.
   - Cache selection.

4. **Color per calendar**
   - Each calendar has its own color.
   - Events are rendered with that calendar color (background or border).
   - Provide a simple legend and optional calendar toggles.

5. **Multi-day event spanning**
   - Multi-day all-day events (and timed events that cross midnight) must visually span across day rows.
   - Render multi-day events as a single vertical block with the title shown once.
   - If an event spans month boundaries, split rendering segments per month column.
   - For overlapping events in the same day, render up to three narrow columns; if more than three, show a third "..." block to indicate overflow.
   - Event titles should not overwrite day labels; keep labels visible.
   - Event blocks should allow internal scroll if text exceeds the block height.

### Nice-to-Haves (If time permits, but don’t block MVP)
- Search/filter events text.
- “Today” row highlight.
- Quick jump to a year picker.
- Click event → open in Google Calendar web.
- Offline caching (last successful fetch).
- Settings page for preferences.

---

## Authentication Requirements (Important)
### Constraints
- Chrome extensions cannot directly “reuse the current Chrome session cookies” to call Google APIs.
- The correct low-friction approach is **OAuth via `chrome.identity`** which often feels like “already signed in” because Chrome can reuse the signed-in profile for consent.

### Implementation Direction
- Manifest V3 extension.
- Use `chrome.identity.getAuthToken({ interactive: true })`.
- Use the token as a Bearer token to call Google Calendar API.
- Handle token invalidation and refresh:
  - On 401/invalid token: call `chrome.identity.removeCachedAuthToken` then retry with `interactive: true` once.

### Scopes (start minimal)
- `https://www.googleapis.com/auth/calendar.readonly`

---

## Data Requirements
### What to Fetch
- Calendar list: `calendarList.list`
- Events: `events.list` per selected calendar
  - Use `timeMin`/`timeMax` for the current year (Jan 1 – Dec 31, local timezone).
  - Expand recurring events by setting `singleEvents=true`.
  - Sort by start time.
  - Ensure `timeZone` handling is correct.

### Time Handling Rules
- Support:
  - All-day events (start/end are `date`)
  - Timed events (start/end are `dateTime`)
  - Events that cross midnight (treat as spanning days)
- Normalize everything into “day buckets” in the user’s local timezone.
- For all-day events, Google’s end date is exclusive; treat it carefully:
  - Example: start=2026-01-10, end=2026-01-12 means it covers Jan 10 and Jan 11.

### Multi-day Rendering Rule
- Convert each event into one or more render segments:
  - For spanning visuals, compute top row and height (rows spanned), and render as a single vertical block positioned within the month column’s day grid.
  - Show the event title once per segment (not on every row).

---

## UI / UX Requirements
### Primary UI
- Extension opens into a **popup** or **new tab** style page.
  - Prefer a full-page extension view (e.g., `chrome://extensions` doesn’t allow; use `chrome-extension://.../index.html` opened from popup).
  - MVP can be popup if it fits, but 12 months likely needs a full page.

### Layout
- 12 columns with month names at top.
- Rows 1..31 per month cell, with day number + weekday label inline.
- Horizontal scrolling when the month columns overflow the viewport.
- Each month cell can contain:
  - A list of events for that day (truncate with “+N more”), OR
  - Spanning event blocks (preferred for multi-day).

### Interactions
- Calendar selector (multi-select list with color indicators).
- Refresh button.
- Clicking an event opens Google Calendar event in a new tab.
- Hovering an event shows details (title + EU date/time format).
- Export PDF action (via print dialog): Jan–Jun on one A4 page, Jul–Dec on a second page.

### Accessibility
- Keyboard navigable controls.
- High contrast readable event text.

---

## Technical Constraints
- Chrome Extension **Manifest V3**
- No frameworks required, but acceptable to use lightweight tooling if it speeds delivery.
- Keep permissions minimal.
- Store settings in `chrome.storage.sync` where possible.

---

## Suggested Architecture
### Files
- `manifest.json`
- `src/`
  - `background.js` (service worker): auth token + API fetch helpers
  - `ui/`
    - `index.html`
    - `styles.css`
    - `app.js`
  - `lib/`
    - `googleApi.js` (Calendar list + events fetch)
    - `normalizeEvents.js` (normalize into day spans + render segments)
    - `storage.js`
- `assets/` icons

### Responsibilities
- background/service worker:
  - Token management
  - API calls (or provide token to UI, but prefer keeping API logic centralized)
- UI:
  - Calendar selection UI
  - Render 12-month grid
  - Render events from normalized segments

---

## Milestones / Plan (Do in this order)
1. **Bootstrap MV3 extension**
   - Basic UI page loads.
   - “Sign in” button calls auth and shows user is authenticated.

2. **Calendar list + selection**
   - Fetch calendars.
   - Render list with colors.
   - Save selected calendars in storage.

3. **Fetch events for year**
   - For selected calendars, fetch events in parallel.
   - Merge results tagged with calendarId + color.

4. **Normalize events**
   - Convert events to day spans in local timezone.
   - Ensure all-day exclusive end logic is correct.
   - Expand recurring events using `singleEvents=true`.

5. **Render 12-month view**
   - Stable grid layout.
   - Day rows 1..31.
   - Render event blocks, including multi-day spanning.

6. **Polish**
   - Loading states, error messages, refresh.
   - Click-to-open event.
   - “Today” highlight.

---

## Definition of Done
- User can authenticate successfully.
- User can select multiple calendars and see them colored distinctly.
- Events display correctly in a 12-month column view.
- Multi-day events visibly span multiple day rows.
- Works for all-day, timed, recurring, and cross-midnight events.
- No overly broad permissions; no insecure token handling.
- Clear README with install steps + Google OAuth setup instructions.

---

## Notes for the Agent
- Prefer correctness in date handling over UI bells and whistles.
- Avoid heavy dependencies unless truly needed.
- Build small, test frequently.
- Include basic error recovery for auth and API rate/permission issues.
