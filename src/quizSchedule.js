/*
 * Spaced repetition for the medicines quiz (the SM-2 scheme used by Anki, simplified).
 * Pure: every function takes its input and returns a result. Depends on constants.js.
 *
 * A card's schedule is { due, interval, ease, reps, lapses, first }:
 *   due      day number when the card is next asked (see dayNumber)
 *   interval days between the last answer and `due`; 0 means "again today"
 *   ease     how fast the interval grows on Good (starts at 2.5)
 *   reps     times answered, lapses: times forgotten after it had been learnt
 *   first    day number the card was first answered, used for the daily limits
 */
import { RATING } from './constants.js';

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

/** A daily-limit setting kept within its allowed range, or its default when not a number. */
export function clampSetting(value, limits) {
  const number = Math.round(Number(value));
  if (value === null || value === undefined || !Number.isFinite(number)) return limits.DEFAULT;
  return Math.min(limits.MAX, Math.max(limits.MIN, number));
}

/** The day a card was last answered: answering sets its due day that many days ahead. */
const lastAnsweredDay = (schedule) => schedule.due - schedule.interval;

/** The cards of each medicine, in card order: [[card, card…], …]. */
function cardsByMedicine(cards) {
  const groups = [];
  const groupById = {};
  for (const card of cards) {
    if (!groupById[card.medicineId]) {
      groupById[card.medicineId] = [];
      groups.push(groupById[card.medicineId]);
    }
    groupById[card.medicineId].push(card);
  }
  return groups;
}

/**
 * Today's new cards: every unstudied card of the next medicines, a whole medicine at a time
 * (Decision Z7). A medicine started today keeps its remaining cards without using another
 * place. Returns { newIds, newMedicineCount, newMedicinesLeftToday }.
 */
function newCardsToday(cards, schedules, today, newMedicinesPerDay) {
  const startedToday = [];
  const waiting = [];
  for (const medicineCards of cardsByMedicine(cards)) {
    const unseen = medicineCards.filter((card) => !schedules[card.id]).map((card) => card.id);
    const isStartedToday = medicineCards.some((card) => schedules[card.id]?.first === today);
    if (isStartedToday) startedToday.push(unseen);
    else if (unseen.length > 0) waiting.push(unseen);
  }
  const newMedicinesLeftToday = Math.max(0, newMedicinesPerDay - startedToday.length);
  const chosen = waiting.slice(0, newMedicinesLeftToday);
  return {
    newIds: [...startedToday, ...chosen].flat(),
    newMedicineCount: chosen.length,
    newMedicinesLeftToday,
  };
}

/**
 * Today's due cards, oldest due first. Reviews (cards first studied before today) are limited
 * to `reviewsPerDay`, counting those already answered today (Decision Z6). A card answered
 * today and due again (rated Again) always comes back, so a session can be finished.
 */
function dueCardsToday(cards, schedules, today, reviewsPerDay) {
  const answeredTodayAndDue = [];
  const reviews = [];
  let reviewsDone = 0;
  cards.forEach((card, order) => {
    const schedule = schedules[card.id];
    if (!schedule) return;
    const answeredToday = lastAnsweredDay(schedule) === today;
    if (answeredToday && schedule.first < today) reviewsDone++;
    if (schedule.due > today) return;
    const item = { id: card.id, due: schedule.due, order };
    if (answeredToday) answeredTodayAndDue.push(item);
    else reviews.push(item);
  });
  const byDueDay = (a, b) => a.due - b.due || a.order - b.order;
  const reviewsLeft = Math.max(0, reviewsPerDay - reviewsDone);
  const chosen = [
    ...answeredTodayAndDue.sort(byDueDay),
    ...reviews.sort(byDueDay).slice(0, reviewsLeft),
  ];
  return { dueIds: chosen.map((item) => item.id), reviewsLeftToday: reviewsLeft };
}

/**
 * What can be studied today: { dueIds, newIds, newMedicineCount, newMedicinesLeftToday,
 * reviewsLeftToday }. Due cards come first, then the new medicines' cards in card order.
 * `cards` is the card list in introduction order; `schedules` maps card id to schedule;
 * `settings` is { newMedicinesPerDay, reviewsPerDay }.
 */
export function studyPlan(cards, schedules, today, settings) {
  return {
    ...dueCardsToday(cards, schedules, today, settings.reviewsPerDay),
    ...newCardsToday(cards, schedules, today, settings.newMedicinesPerDay),
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
