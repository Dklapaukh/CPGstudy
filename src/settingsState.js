/*
 * Settings: dark mode (this phone only) and "mark guidelines for review N days after they were
 * marked Complete" (saved with the tracker as APP_SETTINGS_ENTRY_ID, so it is uploaded and merged
 * like any other entry). Depends on state.js, sync.js, logic.js and guidelines.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { getStatus, markedTime, nextTimestamp } from './logic.js';
import { guidelines } from './guidelines.js';
import {
  APP_SETTINGS_ENTRY_ID,
  MARKED_ENTRY_PREFIX,
  REVIEW_AFTER_DAYS,
  STATUS,
  THEME_STORAGE_KEY,
} from './constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- Dark mode (this phone) ---------- */

export function isDarkMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

/** Puts the saved theme on the page (data-theme on <html>, read by the styles). */
export function applyTheme() {
  document.documentElement.dataset.theme = isDarkMode() ? 'dark' : 'light';
}

export function setDarkMode(on) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, on ? 'dark' : 'light');
  } catch {
    // Blocked storage: the theme still changes until the page is reloaded.
  }
  document.documentElement.dataset.theme = on ? 'dark' : 'light';
}

/* ---------- Mark for review after N days (the tracker) ---------- */

/** A whole number of days within REVIEW_AFTER_DAYS; anything else gives the default. */
export function clampDays(value) {
  const days = Math.round(Number(value));
  if (!Number.isFinite(days)) return REVIEW_AFTER_DAYS.DEFAULT;
  return Math.min(REVIEW_AFTER_DAYS.MAX, Math.max(REVIEW_AFTER_DAYS.MIN, days));
}

function storedSettings() {
  const entry = state.entries[APP_SETTINGS_ENTRY_ID];
  if (!entry) return {};
  try {
    const parsed = JSON.parse(entry.n);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Days after Complete before a guideline goes back to Needs review; 0 means never. */
export const getReviewAfterDays = () => clampDays(storedSettings().reviewAfterDays);

function saveEntry(id, status, note, now) {
  const previous = state.entries[id];
  const entry = { s: status, n: note, t: nextTimestamp(previous ? previous.t : 0, now) };
  state.entries[id] = entry;
  state.pendingChanges[id] = { ...entry };
}

export function saveReviewAfterDays(value) {
  const settings = { ...storedSettings(), reviewAfterDays: clampDays(value) };
  saveEntry(APP_SETTINGS_ENTRY_ID, STATUS.INCOMPLETE, JSON.stringify(settings), Date.now());
  saveSession();
  scheduleSync();
  applyAutoReview();
}

/**
 * Ids of Complete guidelines marked at least `days` days before `now`. Pure: takes the
 * guidelines and entries, returns ids. Nothing when `days` is 0.
 */
export function dueForReviewIds(allGuidelines, entries, days, now) {
  if (!days) return [];
  return allGuidelines
    .filter((guideline) => getStatus(entries, guideline.id) === STATUS.COMPLETE)
    .filter((guideline) => {
      const markedAt = markedTime(entries, guideline.id);
      return markedAt > 0 && now - markedAt >= days * DAY_MS;
    })
    .map((guideline) => guideline.id);
}

/**
 * Moves every Complete guideline that is due back to Needs review, keeping its notes, and
 * records the date it was marked, as pressing Review would. Returns how many changed.
 */
export function applyAutoReview(now = Date.now()) {
  const ids = dueForReviewIds(guidelines, state.entries, getReviewAfterDays(), now);
  ids.forEach((id) => {
    saveEntry(id, STATUS.REVIEW, state.entries[id].n || '', now);
    saveEntry(MARKED_ENTRY_PREFIX + id, STATUS.INCOMPLETE, String(now), now);
  });
  if (ids.length) {
    saveSession();
    scheduleSync();
  }
  return ids.length;
}
