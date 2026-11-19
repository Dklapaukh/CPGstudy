/*
 * Study streak (feature 14): the local days on which at least one Quiz-tab activity was finished
 * (a Medicines session or practice run, a guideline quiz play, a Pick the guideline round, a
 * Medicine test or a scenario run). Saved as one extra entry
 * (STREAK_ENTRY_ID, note = JSON { days: [day numbers] }), so it is uploaded and merged like any
 * other entry and needs no backend change (its id has no prefix the backend reads).
 * The pure functions take the days and return numbers, so they are tested without the page.
 * Depends on state.js, sync.js, logic.js, quizSchedule.js and constants.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { nextTimestamp } from './logic.js';
import { dayNumber } from './quizSchedule.js';
import { STATUS, STREAK_ENTRY_ID, STREAK_DAYS_KEPT, DEMO_TRACKER_LABEL } from './constants.js';

/* ---------- Pure ---------- */

/** Sorted, unique whole day numbers from a saved note; anything unreadable gives []. */
export function parseStreakDays(note) {
  try {
    const days = JSON.parse(note || '{}').days;
    if (!Array.isArray(days)) return [];
    return [...new Set(days.filter(Number.isInteger))].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** How many days in a row end on `lastDay` (0 when `lastDay` is not in the set). */
function runEndingOn(daySet, lastDay) {
  let length = 0;
  while (daySet.has(lastDay - length)) length += 1;
  return length;
}

/**
 * The streak on `today`: { count, isActive }. Active means a quiz was finished today. A streak
 * finished yesterday still counts (it can be kept alive today) but is not active.
 */
export function currentStreak(days, today) {
  const daySet = new Set(days);
  if (daySet.has(today)) return { count: runEndingOn(daySet, today), isActive: true };
  return { count: runEndingOn(daySet, today - 1), isActive: false };
}

/** The longest run of days in a row. `days` sorted ascending. */
export function longestStreak(days) {
  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    run = index > 0 && day === days[index - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// Light-hearted ranks on the Data tab, by the number of quiz days.
const RAT_RANKS = [
  { from: 0, name: 'Lab rat' },
  { from: 3, name: 'Maze runner' },
  { from: 10, name: 'Street rat' },
  { from: 25, name: 'Sewer sergeant' },
  { from: 50, name: 'Pack leader' },
  { from: 100, name: 'Rat king' },
];

/** The rank for `quizDays`: { name, next (the next rank's name or ''), toNext (days) }. */
export function ratRank(quizDays) {
  const index = RAT_RANKS.findLastIndex((rank) => quizDays >= rank.from);
  const next = RAT_RANKS[index + 1];
  return {
    name: RAT_RANKS[index].name,
    next: next ? next.name : '',
    toNext: next ? next.from - quizDays : 0,
  };
}

/**
 * The last `weeks` weeks as columns of 7 days, oldest first, the last column ending today:
 * [[{ day, done }]]. `days` is any list of day numbers.
 */
export function activityWeeks(days, today, weeks) {
  const daySet = new Set(days);
  const first = today - weeks * 7 + 1;
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = first + week * 7 + weekday;
      return { day, done: daySet.has(day) };
    }),
  );
}

/** True when `label` is the demonstration tracker's label (any case, spaces ignored). */
export const isDemoLabel = (label) => (label || '').trim().toLowerCase() === DEMO_TRACKER_LABEL;

/* ---------- Saved days ---------- */

export const todayNumber = () => dayNumber(Date.now(), new Date().getTimezoneOffset());

/** The saved streak days (day numbers), oldest first. */
export const streakDays = () => {
  const entry = state.entries[STREAK_ENTRY_ID];
  return parseStreakDays(entry && entry.n);
};

// Set when a finished quiz starts today's streak; the screen shows the celebration and clears it.
let celebrationPending = false;

/** Saves `days` as the streak entry, uploaded and merged like any other entry. */
function saveStreakDays(days) {
  const previous = state.entries[STREAK_ENTRY_ID];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: JSON.stringify({ days }),
    t: nextTimestamp(previous ? previous.t : 0, Date.now()),
  };
  state.entries[STREAK_ENTRY_ID] = entry;
  state.pendingChanges[STREAK_ENTRY_ID] = { ...entry };
  saveSession();
  scheduleSync();
}

/** Records today as a quiz day. The first quiz of the day queues the celebration. */
export function recordQuizFinished() {
  const today = todayNumber();
  const days = streakDays();
  if (days.includes(today)) return;
  saveStreakDays([...days, today].slice(-STREAK_DAYS_KEPT));
  celebrationPending = true;
}

/** True when the open tracker is the demonstration tracker. */
export const isDemoTracker = () => isDemoLabel(state.label);

/**
 * Demo tracker only: takes today off the quiz days, so the rat is sad again and the next
 * double tap can show the power-up. Earlier days are kept.
 */
export function forgetTodayForDemo() {
  const today = todayNumber();
  saveStreakDays(streakDays().filter((day) => day !== today));
}

/** True once after a quiz started today's streak. */
export function takeCelebration() {
  const pending = celebrationPending;
  celebrationPending = false;
  return pending;
}
