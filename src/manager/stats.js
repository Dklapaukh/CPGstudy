/*
 * Manager page: pure sums over the numbers the backend's "stats" action returns. Takes input and
 * returns a result; touches no page, storage or network. Tested in tests/manager.test.js.
 * A tracker is { label, lastActive, statuses, marked, quizzes, flashcards }; a History row is
 * [tracker number, entry id, value, time, back-filled]. Depends on constants.js only.
 */
import { STATUS, GUIDELINE_QUIZ_ENTRY_PREFIX } from '../constants.js';

// Positions in one History row from the backend (readHistory_ in backend/Code.gs).
const HISTORY = { TRACKER: 0, ENTRY: 1, VALUE: 2, TIME: 3, BACKFILLED: 4 };
const DAYS_IN_WEEK = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// A chart never draws more weeks than this (about five years), whatever dates are typed.
export const MAX_CHART_WEEKS = 260;

const isQuizRow = (row) => String(row[HISTORY.ENTRY]).startsWith(GUIDELINE_QUIZ_ENTRY_PREFIX);
const isCompletion = (row) => !isQuizRow(row) && row[HISTORY.VALUE] === STATUS.COMPLETE;
const average = (numbers) =>
  numbers.length ? Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length) : null;

/** The History rows of one tracker; every row when `trackerIndex` is null (the whole team). */
export function historyFor(history, trackerIndex) {
  if (trackerIndex === null) return history;
  return history.filter((row) => row[HISTORY.TRACKER] === trackerIndex);
}

/** How many of `guidelineList` are in each status: { incomplete, review, complete, total }. */
export function statusCounts(guidelineList, statuses) {
  const counts = { incomplete: 0, review: 0, complete: 0, total: guidelineList.length };
  for (const guideline of guidelineList) {
    const status = statuses[guideline.id];
    if (status === STATUS.COMPLETE) counts.complete++;
    else if (status === STATUS.REVIEW) counts.review++;
    else counts.incomplete++;
  }
  return counts;
}

/** Status counts of each section, as [{ name, incomplete, review, complete, total }]. */
export function sectionCounts(sections, statuses) {
  return sections.map((section) => ({
    name: section.name,
    ...statusCounts(section.items, statuses),
  }));
}

/**
 * Times each guideline quiz was played since History started, by guideline id. Back-filled rows
 * are left out: before launch only the best and latest scores were kept, not every play.
 */
export function attemptCounts(trackerHistory) {
  const counts = {};
  for (const row of trackerHistory) {
    if (!isQuizRow(row) || row[HISTORY.BACKFILLED]) continue;
    const guidelineId = row[HISTORY.ENTRY].slice(GUIDELINE_QUIZ_ENTRY_PREFIX.length);
    counts[guidelineId] = (counts[guidelineId] || 0) + 1;
  }
  return counts;
}

/**
 * One row per guideline quiz the person has played, in guideline order:
 * { id, number, title, last, lastAt, best, bestAt, attempts }. `quizzed` is every guideline
 * that has a quiz; scores of guidelines no longer quizzed are left out.
 */
export function quizRows(quizzed, quizzes, trackerHistory) {
  const attempts = attemptCounts(trackerHistory);
  return quizzed
    .filter((guideline) => quizzes[guideline.id])
    .map((guideline) => {
      const score = quizzes[guideline.id];
      return {
        id: guideline.id,
        number: guideline.number,
        title: guideline.title,
        last: score.last,
        lastAt: score.lastAt,
        best: score.best,
        bestAt: score.at,
        attempts: attempts[guideline.id] || 0,
      };
    });
}

/**
 * Flashcard totals for the Medicines quiz: { started, learnt, due, total }. `flashcards` is
 * { medicineId: [[due day, interval], …] }; a card is learnt once its interval is a day or more,
 * and due when its day has come (`today` is a day number, see dayNumber in quizSchedule.js).
 */
export function flashcardTotals(flashcards, totalCards, today) {
  const cards = Object.values(flashcards).flat();
  return {
    started: cards.length,
    learnt: cards.filter(([, interval]) => interval > 0).length,
    due: cards.filter(([due]) => due <= today).length,
    total: totalCards,
  };
}

/** One line of the team table for a tracker. `content` is { studyGuidelines, quizzed }. */
export function teamRow(tracker, content) {
  const played = content.quizzed.filter((guideline) => tracker.quizzes[guideline.id]);
  return {
    label: tracker.label,
    ...statusCounts(content.studyGuidelines, tracker.statuses),
    quizzesDone: played.length,
    quizzesTotal: content.quizzed.length,
    lastActive: tracker.lastActive,
  };
}

/**
 * General numbers for one person: completions in the last 7 and 30 days, quiz plays recorded,
 * and the average of their most recent and best quiz scores (null when no quiz was played).
 */
export function generalStats(tracker, trackerHistory, now) {
  const completionsSince = (days) =>
    trackerHistory.filter((row) => isCompletion(row) && row[HISTORY.TIME] > now - days * DAY_MS)
      .length;
  const scores = Object.values(tracker.quizzes);
  return {
    lastActive: tracker.lastActive,
    completionsLast7Days: completionsSince(DAYS_IN_WEEK),
    completionsLast30Days: completionsSince(30),
    quizPlaysRecorded: trackerHistory.filter((row) => isQuizRow(row) && !row[HISTORY.BACKFILLED])
      .length,
    averageLatestScore: average(scores.map((score) => score.last)),
    averageBestScore: average(scores.map((score) => score.best)),
  };
}

/** The start (local midnight on Monday) of the week a time falls in, in milliseconds. */
export function weekStart(milliseconds) {
  const date = new Date(milliseconds);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK));
  return date.getTime();
}

/** The Monday after the one given. Uses the calendar, so a daylight-saving week is still a week. */
function nextWeekStart(milliseconds) {
  const date = new Date(milliseconds);
  date.setDate(date.getDate() + DAYS_IN_WEEK);
  return date.getTime();
}

/**
 * Completions and quiz scores by week between two times, for the charts. Returns one item per
 * week, empty weeks included: { weekStart, completions, quizCount, quizAverage } (the average is
 * null in a week with no quiz). At most MAX_CHART_WEEKS weeks, counted from `from`.
 */
export function weeklySeries(history, from, to) {
  const weeks = new Map();
  let start = weekStart(from);
  while (start <= to && weeks.size < MAX_CHART_WEEKS) {
    weeks.set(start, { weekStart: start, completions: 0, scores: [] });
    start = nextWeekStart(start);
  }
  for (const row of history) {
    const time = row[HISTORY.TIME];
    const week = time >= from && time <= to ? weeks.get(weekStart(time)) : undefined;
    if (!week) continue;
    if (isQuizRow(row)) week.scores.push(row[HISTORY.VALUE]);
    else if (isCompletion(row)) week.completions++;
  }
  return [...weeks.values()].map((week) => ({
    weekStart: week.weekStart,
    completions: week.completions,
    quizCount: week.scores.length,
    quizAverage: average(week.scores),
  }));
}

/** The earliest time in the History rows, or `fallback` when there are none. */
export function earliestTime(history, fallback) {
  const times = history.map((row) => row[HISTORY.TIME]).filter((time) => time > 0);
  return times.length ? Math.min(...times) : fallback;
}

/** A time as the text a date box uses, "2026-11-16", in local time. */
export function dateInputValue(milliseconds) {
  const date = new Date(milliseconds);
  const twoDigits = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

/**
 * A date box's text as a local time in milliseconds: the start of that day, or its last
 * millisecond when `endOfDay`. Returns null for text that is not a date.
 */
export function parseDateInput(text, endOfDay = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.getTime();
}
