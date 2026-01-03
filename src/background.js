// src/background.js (MV3 service worker, ES module)

import { apiFetchCalendarList, apiFetchEventsForYear } from "./lib/googleApi.js";

chrome.action.onClicked.addListener(async () => {
  // Open a dedicated extension page for the big 12-month UI
  const url = chrome.runtime.getURL("src/ui/index.html");
  await chrome.tabs.create({ url });
});

// Centralized auth helper
async function getTokenInteractive(interactive) {
  const result = await chrome.identity.getAuthToken({ interactive });
  if (typeof result === "string") return result;
  if (result && typeof result.token === "string") return result.token;
  throw new Error("Unexpected token response from chrome.identity");
}

async function removeCachedToken(token) {
  if (typeof token !== "string") return;
  return await chrome.identity.removeCachedAuthToken({ token });
}

// Generic helper to handle 401 once by clearing cached token and retrying interactively
async function withAuthRetry(fn) {
  let token = null;
  try {
    token = await getTokenInteractive(false);
  } catch {
    token = await getTokenInteractive(true);
  }

  try {
    return await fn(token);
  } catch (err) {
    const msg = String(err?.message || err);
    if (err?.status === 401 || msg.includes(" 401:") || msg.includes("Invalid Credentials")) {
      if (token) await removeCachedToken(token);
      const freshToken = await getTokenInteractive(true);
      return await fn(freshToken);
    }
    // If we failed because we need interaction, try interactive.
    if (msg.includes("The user did not approve access") || msg.includes("OAuth2 not granted") || msg.includes("interaction_required")) {
      const interactiveToken = await getTokenInteractive(true);
      return await fn(interactiveToken);
    }
    throw err;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "AUTH_CHECK") {
        // Attempt non-interactive token acquisition
        try {
          const token = await getTokenInteractive(false);
          sendResponse({ ok: true, authed: Boolean(token) });
        } catch {
          sendResponse({ ok: true, authed: false });
        }
        return;
      }

      if (message?.type === "AUTH_INTERACTIVE") {
        const token = await getTokenInteractive(true);
        sendResponse({ ok: true, authed: Boolean(token) });
        return;
      }

      if (message?.type === "FETCH_CALENDAR_LIST") {
        const result = await withAuthRetry(async (token) => apiFetchCalendarList(token));
        sendResponse({ ok: true, data: result });
        return;
      }

      if (message?.type === "FETCH_EVENTS_FOR_YEAR") {
        const { year, calendarIds } = message.payload || {};
        const result = await withAuthRetry(async (token) =>
          apiFetchEventsForYear(token, { year, calendarIds })
        );
        sendResponse({ ok: true, data: result });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (err) {
      // Handle 401 by clearing token once; UI can retry
      const errorText = String(err?.message || err);
      sendResponse({ ok: false, error: errorText });
    }
  })();

  // Keep the message channel open for async response
  return true;
});
