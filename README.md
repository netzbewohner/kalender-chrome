# Kalender — Chrome Extension (Google Calendar 12-Month View)

Kalender is a Chrome Extension that displays your Google Calendar events in a **12-month column layout** (Jan–Dec), with **day rows (1..31)**. It supports **multiple calendars**, **unique colors per calendar**, and **multi-day events that span multiple rows**. This project was developed with the assistance of AI tools.


## Features
- Google Calendar integration (read-only)
- 12 months shown at once (months as columns)
- Horizontal scroll when all months do not fit on screen
- Rows 1..31 per month with day + weekday on one line (invalid dates empty)
- Weekend cells (Sa/Su) are shaded
- Multiple calendars selectable
- Per-calendar colors + legend
- Multi-day events render as vertical blocks with the title shown once (split across months when needed)
- Overlapping events render in up to three narrow columns; extra events show as "..."
- Hover events to see details (EU date/time format)
- Event blocks allow internal scroll when text is long
- Export PDF (via print dialog): Jan–Jun on one A4 page, Jul–Dec on a second page
- View toggle: switch between columns and rows
- Transposed view: wider day columns, labels on top, dynamic row heights based on overlapping events
- Year selection
- Collapsible sidebar with floating expand button

---

## AI Assistance

This repository includes an `AGENTS.md` file containing guidance for AI coding agents.
It is not required reading for contributors but helps maintain architectural consistency.

---

## Development Setup

### 1) Create a Google Cloud Project + OAuth Client (Chrome Extension)
1. Go to Google Cloud Console → APIs & Services.
2. Create (or select) a project.
3. Enable the **Google Calendar API**.
4. Configure **OAuth consent screen** (External is fine for testing; add yourself as a test user if needed).
5. Create **OAuth client ID**:
   - Application type: **Chrome Extension**
   - Extension ID: (you can add later once you load the unpacked extension and see the generated ID)

> Note: For `chrome.identity`, Google typically expects the extension ID to be registered for the OAuth client.

### 2) Put OAuth Client ID into the extension
Open `manifest.json` and replace:
- `oauth2.client_id` with your OAuth client ID (ends with `.apps.googleusercontent.com`)

### 3) Load extension in Chrome
1. `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the repo folder (the one containing `manifest.json`)

After loading, copy your **Extension ID** and ensure it matches the one associated with your OAuth client in Google Cloud Console.

### 4) Run it
- Click the extension icon → it opens the Kalender UI page
- Click **Sign in**
- Choose a year and layout
- Select calendars (left sidebar)
- Click **Refresh**

---

## Permissions & Auth Notes

Kalender uses Chrome’s built-in OAuth flow:
- `chrome.identity.getAuthToken({ interactive: true })`

This is the closest you can get to “use current Chrome session” in an extension:
- If you’re already signed into Chrome, the consent/sign-in is usually fast.
- Extensions cannot directly reuse Google cookies to call Google APIs.

Scopes:
- `https://www.googleapis.com/auth/calendar.readonly`

---

## Project Structure

- `manifest.json` — MV3 manifest + OAuth config
- `src/background.js` — service worker (token + API proxy)
- `src/ui/index.html` — main UI
- `src/ui/app.js` — rendering + interactions
- `src/ui/styles.css` — layout styles
- `src/lib/googleApi.js` — Calendar API calls
- `src/lib/normalizeEvents.js` — normalize events into day spans
- `src/lib/storage.js` — settings persistence

---

## Troubleshooting

### “OAuth client was not found” / “redirect_uri_mismatch”
- Make sure you created the OAuth client as **Chrome Extension**
- Ensure the OAuth client is associated with your **Extension ID**
- Reload the extension after changes

### 401 / invalid token
- Kalender clears the cached token and retries once interactively.

### No events showing
- Ensure calendars are selected
- Confirm you have events in the current year
- Try Refresh

---

## Security
- Read-only scope
- No tokens stored manually; uses Chrome identity token cache
- Minimal permissions

---

## Contributions Welcome 🎨

Kalender is functionally solid, but **design and UX are the areas where help is most needed**.

If you enjoy:
- Visual design
- Layout systems
- Data-dense UI
- Making complex information feel simple

…your contributions would be especially valuable.

Design improvements, mockups, and UX suggestions are very welcome — even without code.
