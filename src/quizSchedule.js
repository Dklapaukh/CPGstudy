/*
 * Spaced repetition for the medicines quiz (the SM-2 scheme used by Anki, simplified).
 * Pure: every function takes its input and returns a result. Depends on constants.js.
 *
 * A card's schedule is { due, interval, ease, reps, lapses, first }:
 *   due      day number when the card is next asked (see dayNumber)
 *   interval days between the last answer and `due`; 0 means "again today"
 *   ease     how fast the interval grows on Good (starts at 2.5)
 *   reps     times answered, lapses: times forgotten after it had been learnt
 *   first    day number the card was first answered, used for the new-cards-per-day limit
 */
import { RATING, QUIZ_NEW_PER_DAY } from './constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const START_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365;
// How each rating changes the ease, and the first interval of a card not yet learnt.
const EASE_CHANGE = {
  [RATING.AGAIN]: -0.2,
  [RATING.HARD]: -0.15,
  [RATING.GOOD]: 0,
  [RATING.EASY]: 0.15,
};
const FIRST_INTERVAL = { [RATING.AGAIN]: 0, [RATING.HARD]: 1, [RATING.GOOD]: 1, [RATING.EASY]: 4 };
const HARD_GROWTH = 1.2;
const EASY_BONUS = 1.3;
const EASE_DECIMALS = 100;

/** The local calendar day of a time, as a whole number. `offsetMinutes` is getTimezoneOffset(). */
export function dayNumber(milliseconds, offsetMinutes) {
  return Math.floor((milliseconds - offsetMinutes * MS_PER_MINUTE) / DAY_MS);
}

/** The interval in days after answering with `rating`, given the card's previous schedule. */
export function nextInterval(previous, rating) {
  const interval = previous ? previous.interval : 0;
  if (rating === RATING.AGAIN) return 0;
  if (interval === 0) return FIRST_INTERVAL[rating];
  const ease = previous.ease;
  const grown = {
    [RATING.HARD]: Math.ceil(interval * HARD_GROWTH),
    [RATING.GOOD]: Math.round(interval * ease),
    [RATING.EASY]: Math.round(interval * ease * EASY_BONUS),
  }[rating];
  // Good and Easy always move the card at least one day further than last time.
  const atLeast = rating === RATING.HARD ? interval : interval + 1;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(atLeast, grown));
}

/** The card's new schedule after it was answered with `rating` on day `today`. */
export function nextSchedule(previous, rating, today) {
  const ease = previous ? previous.ease : START_EASE;
  const wasLearnt = Boolean(previous) && previous.interval > 0;
  const interval = nextInterval(previous, rating);
  const newEase = Math.max(MIN_EASE, ease + EASE_CHANGE[rating]);
  return {
    due: today + interval,
    interval,
    ease: Math.round(newEase * EASE_DECIMALS) / EASE_DECIMALS,
    reps: (previous ? previous.reps : 0) + 1,
    lapses: (previous ? previous.lapses : 0) + (rating === RATING.AGAIN && wasLearnt ? 1 : 0),
    first: previous ? previous.first : today,
  };
}

/** Short text for a rating button, for example "3 days", "1 day" or "again today". */
export function intervalText(days) {
  if (days === 0) return 'again today';
  return days === 1 ? '1 day' : `${days} days`;
}

/** How many new cards a day the settings allow, kept within the allowed range. */
export function clampNewPerDay(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return QUIZ_NEW_PER_DAY.DEFAULT;
  return Math.min(QUIZ_NEW_PER_DAY.MAX, Math.max(QUIZ_NEW_PER_DAY.MIN, number));
}

/**
 * What can be studied today: { dueIds, newIds, newLeftToday }. Due cards come first, oldest
 * due first; new cards follow in card order, as many as are left of today's new-card limit.
 * `cards` is the card list in introduction order; `schedules` maps card id to schedule.
 */
export function studyPlan(cards, schedules, today, newPerDay) {
  const due = [];
  const unseen = [];
  let newStartedToday = 0;
  cards.forEach((card, order) => {
    const schedule = schedules[card.id];
    if (!schedule) unseen.push(card.id);
    else {
      if (schedule.first === today) newStartedToday++;
      if (schedule.due <= today) due.push({ id: card.id, due: schedule.due, order });
    }
  });
  due.sort((a, b) => a.due - b.due || a.order - b.order);
  const newLeftToday = Math.max(0, newPerDay - newStartedToday);
  return {
    dueIds: due.map((item) => item.id),
    newIds: unseen.slice(0, newLeftToday),
    newLeftToday,
  };
}

/** The session queue after answering its first card. Again puts the card back a few places on. */
export function advanceSession(queue, rating, againGap) {
  const [current, ...rest] = queue;
  if (rating !== RATING.AGAIN) return rest;
  const position = Math.min(againGap, rest.length);
  return [...rest.slice(0, position), current, ...rest.slice(position)];
}

// Stored form of one schedule, to keep notes short: [due, interval, ease×100, reps, lapses, first].
const toStored = (s) => [
  s.due,
  s.interval,
  Math.round(s.ease * EASE_DECIMALS),
  s.reps,
  s.lapses,
  s.first,
];

function fromStored(values) {
  const valid = Array.isArray(values) && values.length === 6 && values.every(Number.isFinite);
  if (!valid) return null;
  const [due, interval, ease, reps, lapses, first] = values;
  return { due, interval, ease: ease / EASE_DECIMALS, reps, lapses, first };
}

/** Text for one medicine's quiz entry note: its schedules by card key, as JSON. */
export function serialiseSchedules(schedulesByKey) {
  const stored = {};
  for (const [key, schedule] of Object.entries(schedulesByKey)) stored[key] = toStored(schedule);
  return JSON.stringify(stored);
}

/** Reads a medicine's quiz entry note back into schedules by card key. Bad data gives {}. */
export function parseSchedules(note) {
  let stored;
  try {
    stored = JSON.parse(note || '{}');
  } catch {
    return {}; // a damaged note only loses this medicine's schedule; the cards start again
  }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const schedules = {};
  for (const [key, values] of Object.entries(stored)) {
    const schedule = fromStored(values);
    if (schedule) schedules[key] = schedule;
  }
  return schedules;
}
