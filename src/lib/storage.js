// src/lib/storage.js

const KEYS = {
  selectedCalendarIds: "selectedCalendarIds",
  calendarColors: "calendarColors", // optional override map { [calendarId]: "#RRGGBB" }
  viewMode: "viewMode", // "columns" (months as columns) or "rows" (months as rows)
  sidebarCollapsed: "sidebarCollapsed"
};

export async function loadSettings() {
  const data = await chrome.storage.sync.get([
    KEYS.selectedCalendarIds,
    KEYS.calendarColors,
    KEYS.viewMode,
    KEYS.sidebarCollapsed
  ]);
  return {
    selectedCalendarIds: data[KEYS.selectedCalendarIds] || [],
    calendarColors: data[KEYS.calendarColors] || {},
    viewMode: data[KEYS.viewMode] || "columns",
    sidebarCollapsed: Boolean(data[KEYS.sidebarCollapsed])
  };
}

export async function saveSelectedCalendarIds(ids) {
  await chrome.storage.sync.set({ [KEYS.selectedCalendarIds]: ids });
}

export async function saveCalendarColors(map) {
  await chrome.storage.sync.set({ [KEYS.calendarColors]: map });
}

export async function saveViewMode(mode) {
  await chrome.storage.sync.set({ [KEYS.viewMode]: mode });
}

export async function saveSidebarCollapsed(collapsed) {
  await chrome.storage.sync.set({ [KEYS.sidebarCollapsed]: Boolean(collapsed) });
}
