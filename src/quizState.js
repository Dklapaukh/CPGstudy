/*
 * Reading and saving quiz progress in the state (Decision E, Option 1). Each medicine's card
 * schedules are one extra entry (QUIZ_ENTRY_PREFIX + medicine id) and the daily-limit
 * settings are another (QUIZ_SETTINGS_ENTRY_ID), so they are saved, uploaded and merged by the same
 * code as the guidelines, work offline and follow the tracker to another phone.
 * The study session itself (state.quiz) is kept in memory only.
 * Depends on state.js, sync.js, guidelines.js, logic.js, quizCards.js and quizSchedule.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { sections } from './guidelines.js';
import { nextTimestamp } from './logic.js';
import { buildQuizCards } from './quizCards.js';
import {
  dayNumber,
  nextSchedule,
  parseSchedules,
  serialiseSchedules,
  clampSetting,
  studyPlan,
  advanceSession,
} from './quizSchedule.js';
import {
  STATUS,
  QUIZ_ENTRY_PREFIX,
  QUIZ_SETTINGS_ENTRY_ID,
  QUIZ_SECTION_NAME,
  QUIZ_NEW_MEDICINES_PER_DAY,
  QUIZ_REVIEWS_PER_DAY,
  QUIZ_AGAIN_GAP,
} from './constants.js';

let cachedCards = null;

/** Every quiz card, built from the guidelines the first time it is needed. */
export function quizCards() {
  if (!cachedCards) cachedCards = buildQuizCards(sections, QUIZ_SECTION_NAME);
  return cachedCards;
}

/** Today as a local day number. */
export const today = () => dayNumber(Date.now(), new Date().getTimezoneOffset());

const medicineEntryId = (medicineId) => QUIZ_ENTRY_PREFIX + medicineId;

/** Saves one extra entry (status always Incomplete) on the phone and queues it for upload. */
function saveNoteEntry(entryId, note) {
  const previous = state.entries[entryId];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: note,
    t: nextTimestamp(previous ? previous.t : 0, Date.now()),
  };
  state.entries[entryId] = entry;
  state.pendingChanges[entryId] = { ...entry };
  saveSession();
  scheduleSync();
}

/** Schedules of one medicine's cards, by card key. */
function medicineSchedules(medicineId) {
  const entry = state.entries[medicineEntryId(medicineId)];
  return entry ? parseSchedules(entry.n) : {};
}

/** Schedules of every card that has been answered, by card id. */
export function allSchedules() {
  const byMedicine = {};
  const schedules = {};
  for (const card of quizCards()) {
    if (!byMedicine[card.medicineId])
      byMedicine[card.medicineId] = medicineSchedules(card.medicineId);
    const schedule = byMedicine[card.medicineId][card.key];
    if (schedule) schedules[card.id] = schedule;
  }
  return schedules;
}

// Each daily-limit setting: its name in the stored note and its allowed range.
export const QUIZ_SETTINGS = {
  newMedicinesPerDay: QUIZ_NEW_MEDICINES_PER_DAY,
  reviewsPerDay: QUIZ_REVIEWS_PER_DAY,
};

/** The stored settings note as an object; {} when there is none or it is damaged. */
function storedSettings() {
  const entry = state.entries[QUIZ_SETTINGS_ENTRY_ID];
  if (!entry) return {};
  try {
    const parsed = JSON.parse(entry.n);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {}; // a damaged setting falls back to the defaults
  }
}

/** The daily-limit settings: { newMedicinesPerDay, reviewsPerDay }, each within its range. */
export function getQuizSettings() {
  const stored = storedSettings();
  const settings = {};
  for (const [name, limits] of Object.entries(QUIZ_SETTINGS)) {
    settings[name] = clampSetting(stored[name], limits);
  }
  return settings;
}

/** Saves one daily-limit setting by name; unknown names are ignored. */
export function saveQuizSetting(name, value) {
  if (!QUIZ_SETTINGS[name]) return;
  const settings = { ...getQuizSettings(), [name]: clampSetting(value, QUIZ_SETTINGS[name]) };
  saveNoteEntry(QUIZ_SETTINGS_ENTRY_ID, JSON.stringify(settings));
}

/** What can be studied today (see studyPlan in quizSchedule.js). */
export const currentStudyPlan = () =>
  studyPlan(quizCards(), allSchedules(), today(), getQuizSettings());

/** Starts a study session: due cards first, then today's new medicines' cards. */
export function startSession() {
  const plan = currentStudyPlan();
  state.quiz = { queue: [...plan.dueIds, ...plan.newIds], revealed: false, answered: 0 };
}

/** Ends the session (the schedules already saved are kept). */
export function endSession() {
  state.quiz = null;
}

/** The card at the front of the session, or null when the session is over. */
export function currentCard() {
  if (!state.quiz || state.quiz.queue.length === 0) return null;
  return quizCards().find((card) => card.id === state.quiz.queue[0]) || null;
}

/** The schedule the current card would get with each rating, by rating. */
export function previewRatings(card, ratings) {
  const previous = medicineSchedules(card.medicineId)[card.key] || null;
  const day = today();
  return Object.fromEntries(ratings.map((rating) => [rating, nextSchedule(previous, rating, day)]));
}

/** Records the rating of the current card, saves its schedule and moves the session on. */
export function rateCurrentCard(rating) {
  const card = currentCard();
  if (!card) return;
  const schedules = medicineSchedules(card.medicineId);
  schedules[card.key] = nextSchedule(schedules[card.key] || null, rating, today());
  saveNoteEntry(medicineEntryId(card.medicineId), serialiseSchedules(schedules));
  state.quiz.queue = advanceSession(state.quiz.queue, rating, QUIZ_AGAIN_GAP);
  state.quiz.revealed = false;
  state.quiz.answered++;
}
