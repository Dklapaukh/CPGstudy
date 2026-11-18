/*
 * Reading and saving quiz progress in the state (Decision E, Option 1). Each medicine's card
 * schedules are one extra entry (QUIZ_ENTRY_PREFIX + medicine id) and the daily-limit
 * settings are another (QUIZ_SETTINGS_ENTRY_ID), so they are saved, uploaded and merged by the same
 * code as the guidelines, work offline and follow the tracker to another phone.
 * The study session itself (state.quiz) is kept in memory only.
 * Depends on state.js, sync.js, guidelines.js, logic.js, quizCards.js, quizSchedule.js,
 * practiceLevels.js, questionEdits.js, content/practice-level-overrides.js and
 * content/card-edits.js.
 */
import { state, saveSession } from './state.js';
import { recordQuizFinished } from './streakState.js';
import { scheduleSync } from './sync.js';
import { sections, guidelines, guidelineById } from './guidelines.js';
import { nextTimestamp, noteObject } from './logic.js';
import { buildQuizCards } from './quizCards.js';
import { applyCardEdits } from './questionEdits.js';
import { cardEdits } from '../content/card-edits.js';
import {
  readPracticeLevelTable,
  medicineGrants,
  rsiLevels,
  cardsForLevel,
} from './practiceLevels.js';
import {
  practiceLevelOverrides,
  practiceLevelLineOverrides,
} from '../content/practice-level-overrides.js';
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
  ATP_GUIDELINE_ID,
  ALL_PRACTICE_LEVELS,
} from './constants.js';

let cachedCards = null;

/** Every quiz card, built from the guidelines with editors' changes the first time it is needed. */
export function quizCards() {
  if (!cachedCards)
    cachedCards = applyCardEdits(buildQuizCards(sections, QUIZ_SECTION_NAME), cardEdits);
  return cachedCards;
}

let cachedAccess = null;

/**
 * What the 1.1 table lets each level give: { levels, grantsByMedicine, rsiLevels,
 * lineOverrides } (see cardForLevel in practiceLevels.js).
 */
function practiceLevelAccess() {
  if (!cachedAccess) {
    const atpGuideline = guidelineById(ATP_GUIDELINE_ID);
    const table = atpGuideline ? readPracticeLevelTable(atpGuideline) : { levels: [], rows: [] };
    const medicines = guidelines.filter((guideline) => guideline.sec === QUIZ_SECTION_NAME);
    cachedAccess = {
      levels: table.levels,
      grantsByMedicine: medicineGrants(medicines, table, practiceLevelOverrides),
      rsiLevels: rsiLevels(table),
      lineOverrides: practiceLevelLineOverrides,
    };
  }
  return cachedAccess;
}

/** The practice levels a learner can choose, in table order, e.g. ['EMT', 'Paramedic', …]. */
export const practiceLevels = () => practiceLevelAccess().levels;

// The cards of the last practice level asked for, so they are not filtered again on each draw.
let cachedStudy = { level: null, cards: [] };

/**
 * The cards the chosen practice level studies (all cards when none is chosen): only medicines
 * the level may give, and only dose cards with a line it may give (feature 11).
 */
export function studyCards() {
  const level = getQuizSettings().practiceLevel;
  if (level === ALL_PRACTICE_LEVELS) return quizCards();
  if (cachedStudy.level !== level) {
    cachedStudy = { level, cards: cardsForLevel(quizCards(), level, practiceLevelAccess()) };
  }
  return cachedStudy.cards;
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

/** Schedules of every card in `cards` (default: all) that has been answered, by card id. */
export function allSchedules(cards = quizCards()) {
  const byMedicine = {};
  const schedules = {};
  for (const card of cards) {
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
const storedSettings = () => noteObject(state.entries[QUIZ_SETTINGS_ENTRY_ID]);

/** A stored practice level if it is one of the 1.1 table's levels, otherwise all levels. */
const validPracticeLevel = (value) =>
  practiceLevels().includes(value) ? value : ALL_PRACTICE_LEVELS;

/**
 * The quiz settings: { newMedicinesPerDay, reviewsPerDay, practiceLevel }, the limits each
 * within its range and practiceLevel one of practiceLevels() or ALL_PRACTICE_LEVELS.
 */
export function getQuizSettings() {
  const stored = storedSettings();
  const settings = { practiceLevel: validPracticeLevel(stored.practiceLevel) };
  for (const [name, limits] of Object.entries(QUIZ_SETTINGS)) {
    settings[name] = clampSetting(stored[name], limits);
  }
  return settings;
}

/** Saves one quiz setting by name (a daily limit or 'practiceLevel'); unknown names are ignored. */
export function saveQuizSetting(name, value) {
  let checked;
  if (name === 'practiceLevel') checked = validPracticeLevel(value);
  else if (QUIZ_SETTINGS[name]) checked = clampSetting(value, QUIZ_SETTINGS[name]);
  else return;
  const settings = { ...getQuizSettings(), [name]: checked };
  saveNoteEntry(QUIZ_SETTINGS_ENTRY_ID, JSON.stringify(settings));
}

/** What can be studied today at the chosen practice level (see studyPlan in quizSchedule.js). */
export const currentStudyPlan = () =>
  studyPlan(studyCards(), allSchedules(), today(), getQuizSettings());

/** Starts a study session: due cards first, then today's new medicines' cards. */
export function startSession() {
  const plan = currentStudyPlan();
  state.quiz = { queue: [...plan.dueIds, ...plan.newIds], revealed: false, answered: 0 };
}

/**
 * The medicines that have quiz cards, in guideline order: [{ id, name, cardCount }]. Only those
 * of the chosen practice level, unless `everyLevel` is true.
 */
export function quizMedicines(everyLevel = false) {
  const medicines = [];
  const byId = {};
  for (const card of everyLevel ? quizCards() : studyCards()) {
    if (!byId[card.medicineId]) {
      const guideline = guidelineById(card.medicineId);
      byId[card.medicineId] = {
        id: card.medicineId,
        name: guideline ? guideline.t : card.medicineId,
        cardCount: 0,
      };
      medicines.push(byId[card.medicineId]);
    }
    byId[card.medicineId].cardCount++;
  }
  return medicines;
}

/**
 * Starts practising one medicine: all of its cards at the chosen practice level, in card order.
 * Practice is separate from the daily study: answers are not saved and do not change when any
 * card is due.
 */
export function startPractice(medicineId) {
  const queue = studyCards()
    .filter((card) => card.medicineId === medicineId)
    .map((card) => card.id);
  if (queue.length === 0) return;
  state.quiz = { queue, revealed: false, answered: 0, practiceMedicineId: medicineId };
}

/** Moves a practice session on: Again puts the card back a few places on; Got it removes it. */
export function answerPracticeCard(rating) {
  if (!state.quiz || !state.quiz.practiceMedicineId || state.quiz.queue.length === 0) return;
  state.quiz.queue = advanceSession(state.quiz.queue, rating, QUIZ_AGAIN_GAP);
  state.quiz.revealed = false;
  state.quiz.answered++;
  if (state.quiz.queue.length === 0) recordQuizFinished();
}

/** Ends the session (the schedules already saved are kept). */
export function endSession() {
  state.quiz = null;
}

/**
 * The card at the front of the session as the chosen practice level sees it, or null when the
 * session is over. A card that left the level mid-session (the level was changed on another
 * phone) is still shown, whole.
 */
export function currentCard() {
  if (!state.quiz || state.quiz.queue.length === 0) return null;
  const isCurrent = (card) => card.id === state.quiz.queue[0];
  return studyCards().find(isCurrent) || quizCards().find(isCurrent) || null;
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
  if (!card || state.quiz.practiceMedicineId) return;
  const schedules = medicineSchedules(card.medicineId);
  schedules[card.key] = nextSchedule(schedules[card.key] || null, rating, today());
  saveNoteEntry(medicineEntryId(card.medicineId), serialiseSchedules(schedules));
  state.quiz.queue = advanceSession(state.quiz.queue, rating, QUIZ_AGAIN_GAP);
  state.quiz.revealed = false;
  state.quiz.answered++;
  if (state.quiz.queue.length === 0) recordQuizFinished();
}
