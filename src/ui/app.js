import { loadSettings, saveSelectedCalendarIds, saveSidebarCollapsed, saveViewMode } from "../lib/storage.js";
import { normalizeEventsByDay } from "../lib/normalizeEvents.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const els = {
  app: document.querySelector(".app"),
  status: document.getElementById("status"),
  signInBtn: document.getElementById("signInBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  printBtn: document.getElementById("printBtn"),
  toggleSidebar: document.getElementById("toggleSidebar"),
  expandSidebar: document.getElementById("expandSidebar"),
  viewLinks: document.getElementById("viewLinks"),
  calList: document.getElementById("calList"),
  legend: document.getElementById("legend"),
  grid: document.getElementById("grid"),
  printArea: document.getElementById("printArea"),
  yearLinks: document.getElementById("yearLinks")
};

let gridTargets = [];
let selectedYear = yearNow();
let selectedViewMode = "columns";

function bgSend(type, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (resp) => resolve(resp));
  });
}

function yearNow() {
  return new Date().getFullYear();
}

function buildYearSelect() {
  const y = yearNow();
  const years = [y - 1, y, y + 1];
  if (!els.yearLinks) return;
  els.yearLinks.innerHTML = years
    .map((yr) => `<button type="button" class="link-btn" data-year="${yr}">${yr}</button>`)
    .join("");
  selectedYear = y;
  setActiveYear(y);
}

async function authCheck() {
  const resp = await bgSend("AUTH_CHECK");
  if (resp?.ok && resp.authed) {
    els.status.textContent = "Signed in";
    els.refreshBtn.disabled = false;
    return true;
  }
  els.status.textContent = "Not signed in";
  els.refreshBtn.disabled = true;
  return false;
}

async function authInteractive() {
  const resp = await bgSend("AUTH_INTERACTIVE");
  if (resp?.ok && resp.authed) {
    els.status.textContent = "Signed in";
    els.refreshBtn.disabled = false;
    return true;
  }
  const errText = resp?.error ? `Sign-in failed: ${resp.error}` : "Sign-in failed";
  els.status.textContent = errText;
  console.error("Sign-in failed", resp?.error || resp);
  return false;
}

function pickColorFallback(idx) {
  // simple stable palette fallback (avoid heavy deps)
  const palette = ["#E11D48", "#2563EB", "#16A34A", "#D97706", "#7C3AED", "#0EA5E9", "#DB2777", "#059669"];
  return palette[idx % palette.length];
}

function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function dateKey(year, monthIdx, day) {
  const m = String(monthIdx + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function renderGridSkeleton(year, viewMode) {
  gridTargets = [];

  function buildGridStack(monthStart, monthEnd) {
    const stack = document.createElement("div");
    stack.className = "grid-stack";
    const monthCount = monthEnd - monthStart + 1;
    stack.style.setProperty("--month-count", String(monthCount));
    stack.style.setProperty("--day-count", "31");
    stack.dataset.monthStart = String(monthStart);
    stack.dataset.monthEnd = String(monthEnd);
    stack.dataset.viewMode = viewMode;
    if (viewMode === "rows") stack.classList.add("transpose");

    const root = document.createElement("div");
    root.className = "grid-inner";

    const eventsLayer = document.createElement("div");
    eventsLayer.className = "grid-events";

    if (viewMode === "columns") {
      // Header row: months
      for (let m = monthStart; m <= monthEnd; m++) root.appendChild(cell(`${MONTHS[m]}`, "cell header"));

      // Day rows 1..31
      for (let day = 1; day <= 31; day++) {
        for (let m = monthStart; m <= monthEnd; m++) {
          const dim = daysInMonth(year, m);
          const isValid = day <= dim;
          const c = cell("", `cell day-cell ${isValid ? "" : "invalid"}`);
          c.dataset.month = String(m);
          c.dataset.day = String(day);
          c.dataset.dateKey = isValid ? dateKey(year, m, day) : "";
          if (isValid) {
            const date = new Date(year, m, day);
            const weekday = WEEKDAYS[date.getDay()];
            const isWeekend = weekday === "Sa" || weekday === "Su";
            if (isWeekend) c.classList.add("weekend");

            const label = document.createElement("div");
            label.className = "day-label";
            label.textContent = `${day} ${weekday}`;

            c.appendChild(label);
          }
          root.appendChild(c);
        }
      }
    } else {
      // Months as rows, days as columns.
      for (let m = monthStart; m <= monthEnd; m++) {
        const header = cell(`${MONTHS[m]}`, "cell header month-label");
        root.appendChild(header);
        for (let day = 1; day <= 31; day++) {
          const dim = daysInMonth(year, m);
          const isValid = day <= dim;
          const c = cell("", `cell day-cell ${isValid ? "" : "invalid"}`);
          c.dataset.month = String(m);
          c.dataset.day = String(day);
          c.dataset.dateKey = isValid ? dateKey(year, m, day) : "";
          if (isValid) {
            const date = new Date(year, m, day);
            const weekday = WEEKDAYS[date.getDay()];
            const isWeekend = weekday === "Sa" || weekday === "Su";
            if (isWeekend) c.classList.add("weekend");

            const label = document.createElement("div");
            label.className = "day-label";
            label.textContent = `${day} ${weekday}`;

            c.appendChild(label);
          }
          root.appendChild(c);
        }
      }
    }

    stack.appendChild(root);
    stack.appendChild(eventsLayer);

    return { stack, root, eventsLayer, monthStart, monthEnd, viewMode };
  }

  els.grid.innerHTML = "";
  const main = buildGridStack(0, 11);
  els.grid.appendChild(main.stack);
  gridTargets.push(main);

  if (els.printArea) {
    els.printArea.innerHTML = "";
    const left = buildGridStack(0, 5);
    const leftWrap = document.createElement("div");
    leftWrap.className = "grid print-grid print-page";
    leftWrap.appendChild(left.stack);
    els.printArea.appendChild(leftWrap);
    gridTargets.push(left);

    const right = buildGridStack(6, 11);
    const rightWrap = document.createElement("div");
    rightWrap.className = "grid print-grid";
    rightWrap.appendChild(right.stack);
    els.printArea.appendChild(rightWrap);
    gridTargets.push(right);
  }
}

function cell(text, className) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return div;
}

function renderCalendars(calItems, settings) {
  els.calList.innerHTML = "";

  const selected = new Set(settings.selectedCalendarIds);

  calItems.forEach((cal, idx) => {
    const id = cal.id;
    const title = cal.summary || id;

    // Use Google provided colors if present; else fallback
    const color = cal.backgroundColor || pickColorFallback(idx);

    const row = document.createElement("label");
    row.className = "cal-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selected.has(id);
    cb.addEventListener("change", async () => {
      if (cb.checked) selected.add(id);
      else selected.delete(id);
      await saveSelectedCalendarIds([...selected]);
      renderLegend(calItems, [...selected]);
    });

    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = color;

    const span = document.createElement("span");
    span.textContent = title;

    row.appendChild(cb);
    row.appendChild(sw);
    row.appendChild(span);

    // store for later
    row.dataset.calendarId = id;
    row.dataset.color = color;

    els.calList.appendChild(row);
  });

  renderLegend(calItems, settings.selectedCalendarIds);
}

function setActiveYear(year) {
  selectedYear = Number(year);
  if (!els.yearLinks) return;
  els.yearLinks.querySelectorAll(".link-btn").forEach((btn) => {
    const isActive = Number(btn.dataset.year) === selectedYear;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function setActiveViewMode(mode) {
  selectedViewMode = mode === "rows" ? "rows" : "columns";
  if (!els.viewLinks) return;
  els.viewLinks.querySelectorAll(".link-btn").forEach((btn) => {
    const isActive = btn.dataset.value === selectedViewMode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function applySidebarState(collapsed) {
  if (!els.app || !els.toggleSidebar) return;
  els.app.classList.toggle("sidebar-collapsed", collapsed);
  els.toggleSidebar.textContent = collapsed ? ">>" : "<<";
  els.toggleSidebar.setAttribute("aria-expanded", String(!collapsed));
  els.toggleSidebar.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
  if (els.expandSidebar) {
    els.expandSidebar.setAttribute("aria-expanded", String(!collapsed));
    els.expandSidebar.title = collapsed ? "Expand sidebar" : "Sidebar expanded";
  }
}

function renderLegend(calItems, selectedIds) {
  const selected = new Set(selectedIds || []);
  els.legend.innerHTML = "";

  calItems
    .filter((c) => selected.has(c.id))
    .forEach((c) => {
      const item = document.createElement("div");
      item.className = "legend-item";

      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = c.backgroundColor || "#ddd";

      const label = document.createElement("span");
      label.textContent = c.summary || c.id;

      item.appendChild(sw);
      item.appendChild(label);
      els.legend.appendChild(item);
    });
}

function clearEventsFromGrid() {
  document.querySelectorAll(".event-block").forEach((block) => block.remove());
}

function splitEventByMonth(ev, year) {
  const segments = [];
  const start = new Date(`${ev.startKey}T00:00:00`);
  const end = new Date(`${ev.endKey}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return segments;
  if (start.getFullYear() !== year && end.getFullYear() !== year) return segments;

  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx, daysInMonth(year, monthIdx));
    if (end < monthStart || start > monthEnd) continue;

    const segStart = start > monthStart ? start : monthStart;
    const segEnd = end < monthEnd ? end : monthEnd;
    const startDay = segStart.getDate();
    const endDay = segEnd.getDate();

    segments.push({
      monthIdx,
      startDay,
      endDay,
      span: endDay - startDay + 1
    });
  }

  return segments;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatEventTooltip(ev) {
  if (ev.isAllDay) {
    if (ev.startKey === ev.endKey) {
      return `${formatDate(new Date(`${ev.startKey}T00:00:00`))} (all day)`;
    }
    return `${formatDate(new Date(`${ev.startKey}T00:00:00`))} - ${formatDate(
      new Date(`${ev.endKey}T00:00:00`)
    )} (all day)`;
  }

  const start = ev.startDateTime ? new Date(ev.startDateTime) : new Date(`${ev.startKey}T00:00:00`);
  const end = ev.endDateTime ? new Date(ev.endDateTime) : new Date(`${ev.endKey}T00:00:00`);
  return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
}

function assignMonthLanes(monthSegments, dim) {
  const segments = [...monthSegments].sort((a, b) => {
    if (a.startDay !== b.startDay) return a.startDay - b.startDay;
    if (a.endDay !== b.endDay) return b.endDay - a.endDay;
    return a.ev.title.localeCompare(b.ev.title);
  });

  const lanes = [];
  for (const seg of segments) {
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] < seg.startDay) lanes[i] = null;
    }
    let laneIdx = lanes.findIndex((endDay) => endDay === null);
    if (laneIdx === -1) {
      laneIdx = lanes.length;
      lanes.push(null);
    }
    seg.lane = laneIdx;
    lanes[laneIdx] = seg.endDay;
  }

  const dayCounts = Array(dim + 1).fill(0);
  for (const seg of segments) {
    for (let d = seg.startDay; d <= seg.endDay; d++) dayCounts[d] += 1;
  }

  for (const seg of segments) {
    let maxVisible = 1;
    for (let d = seg.startDay; d <= seg.endDay; d++) {
      const visible = Math.min(3, dayCounts[d]);
      if (visible > maxVisible) maxVisible = visible;
    }
    seg.laneCount = maxVisible;
  }

  return { segments, dayCounts };
}

// Render multi-day events as a single vertical block per month segment.
function renderEventsIntoGrid({ year, calendarMetaById, normalizedByCalendar }) {
  clearEventsFromGrid();

  const all = [];
  for (const [calendarId, normalized] of Object.entries(normalizedByCalendar)) {
    for (const ev of normalized) all.push(ev);
  }

  const monthSegments = Array.from({ length: 12 }, () => []);
  for (const ev of all) {
    const segments = splitEventByMonth(ev, year);
    for (const seg of segments) {
      monthSegments[seg.monthIdx].push({ ...seg, ev });
    }
  }

  function segmentHasOverflow(seg, dayCounts) {
    for (let d = seg.startDay; d <= seg.endDay; d++) {
      if (dayCounts[d] > 3) return true;
    }
    return false;
  }

  for (const target of gridTargets) {
    const gridRoot = target.eventsLayer;
    if (!gridRoot) continue;
    const monthStart = target.monthStart;
    const monthEnd = target.monthEnd;
    const viewMode = target.viewMode || "columns";
    const rowHeights = [];

    for (let m = monthStart; m <= monthEnd; m++) {
      const dim = daysInMonth(year, m);
      const { segments, dayCounts } = assignMonthLanes(monthSegments[m], dim);
      const dayOverflow = Array(dim + 1).fill(null).map(() => []);

      if (viewMode === "rows") {
        const maxCount = Math.max(0, ...dayCounts);
        const maxLanes = Math.max(1, Math.min(3, maxCount));
        const labelGutter = 18;
        const eventBlockHeight = 30;
        const eventGap = 4;
        const eventInset = 4;
        const height =
          labelGutter + (maxLanes * eventBlockHeight) + ((maxLanes - 1) * eventGap) + (2 * eventInset);
        rowHeights.push(height);
        target.stack.style.setProperty("--label-gutter-vertical", `${labelGutter}px`);
        target.stack.style.setProperty("--event-block-height", `${eventBlockHeight}px`);
      }

      for (const seg of segments) {
        if (seg.lane >= 2) {
          for (let d = seg.startDay; d <= seg.endDay; d++) {
            if (dayCounts[d] > 3) dayOverflow[d].push(seg.ev);
          }
        }
      }

      for (const seg of segments) {
        if (seg.lane > 2) continue;
        if (seg.lane === 2 && segmentHasOverflow(seg, dayCounts)) continue;

        const a = document.createElement("a");
        a.className = "event-block";
        a.textContent = seg.ev.title;
        a.title = `${seg.ev.title}\n${formatEventTooltip(seg.ev)}`;
        a.href = seg.ev.htmlLink || "#";
        a.target = "_blank";
        a.rel = "noreferrer";

        const color = seg.ev.calendarColor || calendarMetaById[seg.ev.calendarId]?.color || "#ddd";
        a.style.background = color + "22"; // light tint
        a.style.borderColor = color;
        a.style.setProperty("--lane-index", String(seg.lane));
        a.style.setProperty("--lane-count", String(seg.laneCount));

        if (viewMode === "columns") {
          const startRow = seg.startDay + 1; // row 1 is header
          const endRow = startRow + seg.span;
          a.style.gridColumn = String(m - monthStart + 1);
          a.style.gridRow = `${startRow} / ${endRow}`;
        } else {
          const row = m - monthStart + 1;
          const startCol = seg.startDay + 1; // col 1 is month label
          const endCol = seg.endDay + 2;
          a.style.gridRow = `${row} / ${row + 1}`;
          a.style.gridColumn = `${startCol} / ${endCol}`;
        }

        gridRoot.appendChild(a);
      }

      for (let d = 1; d <= dim; d++) {
        if (dayCounts[d] <= 3) continue;
        const overflow = document.createElement("div");
        overflow.className = "event-block event-overflow";
        overflow.textContent = "...";
        const lines = dayOverflow[d].map((ev) => `${ev.title || "(No title)"} - ${formatEventTooltip(ev)}`);
        overflow.title = lines.length ? lines.join("\n") : "Additional events";
        overflow.style.setProperty("--lane-index", "2");
        overflow.style.setProperty("--lane-count", "3");

        if (viewMode === "columns") {
          const row = d + 1;
          overflow.style.gridColumn = String(m - monthStart + 1);
          overflow.style.gridRow = `${row} / ${row + 1}`;
        } else {
          const row = m - monthStart + 1;
          const col = d + 1;
          overflow.style.gridRow = `${row} / ${row + 1}`;
          overflow.style.gridColumn = `${col} / ${col + 1}`;
        }
        gridRoot.appendChild(overflow);
      }
    }

    if (viewMode === "rows" && target.root) {
      const rows = rowHeights.length ? rowHeights.map((h) => `${h}px`).join(" ") : `repeat(${monthEnd - monthStart + 1}, var(--row-height))`;
      target.root.style.gridTemplateRows = rows;
      gridRoot.style.gridTemplateRows = rows;
    }
  }
}

async function loadCalendarsAndRender(settings) {
  const resp = await bgSend("FETCH_CALENDAR_LIST");
  if (!resp?.ok) throw new Error(resp?.error || "Failed to fetch calendars");

  const items = resp.data?.items || [];
  // Map metadata we care about
  const calendars = items.map((c) => ({
    id: c.id,
    summary: c.summary,
    backgroundColor: c.backgroundColor
  }));

  renderCalendars(calendars, settings);

  return calendars;
}

async function refreshEvents(calendars, settings) {
  const year = selectedYear;
  renderGridSkeleton(year, selectedViewMode);

  const calendarIds = settings.selectedCalendarIds || [];
  if (!calendarIds.length) {
    els.status.textContent = "Select at least one calendar";
    return;
  }

  els.status.textContent = "Fetching events…";

  const resp = await bgSend("FETCH_EVENTS_FOR_YEAR", { year, calendarIds });
  if (!resp?.ok) throw new Error(resp?.error || "Failed to fetch events");

  const calendarMetaById = {};
  for (const c of calendars) {
    calendarMetaById[c.id] = { color: c.backgroundColor || "#ddd", title: c.summary || c.id };
  }

  const normalizedByCalendar = {};
  for (const calId of calendarIds) {
    const feed = resp.data?.[calId];
    const events = feed?.items || [];
    normalizedByCalendar[calId] = normalizeEventsByDay({
      calendarId: calId,
      calendarColor: calendarMetaById[calId]?.color,
      events
    });
  }

  renderEventsIntoGrid({ year, calendarMetaById, normalizedByCalendar });

  els.status.textContent = "Up to date";
}

async function main() {
  buildYearSelect();

  let settings = await loadSettings();
  applySidebarState(settings.sidebarCollapsed);
  selectedViewMode = settings.viewMode || "columns";
  setActiveViewMode(selectedViewMode);
  renderGridSkeleton(selectedYear, selectedViewMode);

  const authed = await authCheck();
  if (!authed) {
    els.status.textContent = "Not signed in";
  }

  let calendars = [];

  async function ensureCalendarsLoaded() {
    settings = await loadSettings();
    calendars = await loadCalendarsAndRender(settings);
  }

  els.signInBtn.addEventListener("click", async () => {
    const ok = await authInteractive();
    if (!ok) return;
    await ensureCalendarsLoaded();
  });

  els.refreshBtn.addEventListener("click", async () => {
    settings = await loadSettings();
    if (!calendars.length) await ensureCalendarsLoaded();
    await refreshEvents(calendars, settings);
  });

  if (els.toggleSidebar) {
    els.toggleSidebar.addEventListener("click", async () => {
      settings = await loadSettings();
      const next = !settings.sidebarCollapsed;
      await saveSidebarCollapsed(next);
      applySidebarState(next);
    });
  }

  if (els.expandSidebar) {
    els.expandSidebar.addEventListener("click", async () => {
      settings = await loadSettings();
      if (!settings.sidebarCollapsed) return;
      await saveSidebarCollapsed(false);
      applySidebarState(false);
    });
  }

  if (els.viewLinks) {
    els.viewLinks.addEventListener("click", async (event) => {
      const btn = event.target.closest(".link-btn");
      if (!btn) return;
      const mode = btn.dataset.value === "rows" ? "rows" : "columns";
      await saveViewMode(mode);
      setActiveViewMode(mode);
      settings = await loadSettings();
      renderGridSkeleton(selectedYear, mode);
      if (calendars.length && settings.selectedCalendarIds?.length) {
        await refreshEvents(calendars, settings);
      }
    });
  }

  if (els.yearLinks) {
    els.yearLinks.addEventListener("click", async (event) => {
      const btn = event.target.closest(".link-btn");
      if (!btn) return;
      setActiveYear(btn.dataset.year);
      settings = await loadSettings();
      renderGridSkeleton(selectedYear, selectedViewMode);
      if (calendars.length && settings.selectedCalendarIds?.length) {
        await refreshEvents(calendars, settings);
      }
    });
  }

  els.printBtn.addEventListener("click", () => {
    window.print();
  });

  // If already authed, load calendars immediately
  if (await authCheck()) {
    await ensureCalendarsLoaded();
  }
}

main().catch((err) => {
  els.status.textContent = `Error: ${String(err?.message || err)}`;
});
