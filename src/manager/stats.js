/*
 * Manager page: pure sums over the numbers the backend's "stats" action returns. Takes input and
 * returns a result; touches no page, storage or network. Tested in tests/manager.test.js.
 * A tracker is { label, lastActive, statuses, marked, quizzes, flashcards, scenarios }; a History
 * row is [tracker number, entry id, value, time, back-filled]. A scenario run's row holds its
 * score (or null when nothing was rated). Depends on constants.js and scenarioLogic.js.
 */
import {
  STATUS,
  GUIDELINE_QUIZ_ENTRY_PREFIX,
  SCENARIO_RUN_ENTRY_PREFIX,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
  DEBRIEF_COMPETENCIES,
  DEBRIEF_RATING_TOP,
  RATED_ON,
} from '../constants.js';
import { scoreOf } from '../scenarioLogic.js';

// Positions in one History row from the backend (readHistory_ in backend/Code.gs).
const HISTORY = { TRACKER: 0, ENTRY: 1, VALUE: 2, TIME: 3, BACKFILLED: 4 };
const DAYS_IN_WEEK = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// A chart never draws more weeks than this (about five years), whatever dates are typed.
export const MAX_CHART_WEEKS = 260;

const isQuizRow = (row) => String(row[HISTORY.ENTRY]).startsWith(GUIDELINE_QUIZ_ENTRY_PREFIX);
const isScenarioRow = (row) => String(row[HISTORY.ENTRY]).startsWith(SCENARIO_RUN_ENTRY_PREFIX);
const isCompletion = (row) =>
  !isQuizRow(row) && !isScenarioRow(row) && row[HISTORY.VALUE] === STATUS.COMPLETE;
const hasScore = (value) => typeof value === 'number';
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

/**
 * One line of the team table for a tracker. `content` is { studyGuidelines, quizzed }; `scenarios`
 * is the tracker's scenarioRows.
 */
export function teamRow(tracker, content, scenarios = []) {
  const played = content.quizzed.filter((guideline) => tracker.quizzes[guideline.id]);
  const scenarioNumbers = scenarioTotals(scenarios);
  return {
    label: tracker.label,
    ...statusCounts(content.studyGuidelines, tracker.statuses),
    quizzesDone: played.length,
    quizzesTotal: content.quizzed.length,
    scenariosRun: scenarioNumbers.scenariosRun,
    scenarioLatest: scenarioNumbers.averageLatest,
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

/**
 * History with each tracker's saved scenario runs added where History lacks them. A tracker keeps
 * its last 3 runs per scenario; History logs every run, but only since the backend began to, so
 * runs from before then exist only in the tracker. A run is matched by scenario and time.
 */
export function withScenarioRuns(history, trackers) {
  const logged = new Set(
    history.filter(isScenarioRow).map((row) => `${row[0]}|${row[1]}|${row[HISTORY.TIME]}`),
  );
  const added = [];
  trackers.forEach((tracker, index) => {
    for (const [scenarioId, record] of Object.entries(tracker.scenarios || {})) {
      const entry = SCENARIO_RUN_ENTRY_PREFIX + scenarioId;
      for (const run of record.runs) {
        if (logged.has(`${index}|${entry}|${run.at}`)) continue;
        added.push([index, entry, scoreOf(run.ratings || []), run.at, 0]);
      }
    }
  });
  return [...history, ...added];
}

/**
 * One row per scenario the person has run, most recently run first: { id, title, complexity,
 * load, runs, first, latest, best, change, lastAt, struggled }. Scores are of the runs that were
 * rated (null when none was); change is latest minus first, null with fewer than two rated runs.
 * `struggled` is the guideline ids ticked in the latest run. `scenarioList` is the live
 * scenarios; runs of scenarios no longer in it are left out.
 */
export function scenarioRows(scenarioList, tracker, trackerHistory) {
  const saved = tracker.scenarios || {};
  return scenarioList
    .filter((scenario) => saved[scenario.id])
    .map((scenario) => {
      const entry = SCENARIO_RUN_ENTRY_PREFIX + scenario.id;
      const runs = trackerHistory
        .filter((row) => row[HISTORY.ENTRY] === entry)
        .sort((a, b) => a[HISTORY.TIME] - b[HISTORY.TIME]);
      const scores = runs.map((row) => row[HISTORY.VALUE]).filter(hasScore);
      const record = saved[scenario.id];
      const latestRun = record.runs[0];
      return {
        id: scenario.id,
        title: scenario.title,
        complexity: scenario.complexity,
        load: scenario.load,
        runs: Math.max(record.count || 0, runs.length),
        first: scores.length ? scores[0] : null,
        latest: scores.length ? scores.at(-1) : null,
        best: scores.length ? Math.max(...scores) : null,
        change: scores.length > 1 ? scores.at(-1) - scores[0] : null,
        lastAt: Math.max(latestRun ? latestRun.at : 0, ...runs.map((row) => row[HISTORY.TIME])),
        struggled: latestRun ? latestRun.struggled || [] : [],
      };
    })
    .sort((a, b) => b.lastAt - a.lastAt);
}

/**
 * Scenario rows grouped by complexity and by scene load: { complexity: [group], load: [group] },
 * group = { key, name, total, run, averageFirst, averageLatest }. `total` is how many live
 * scenarios are in the group; `run` how many rows (for a team, a scenario run by two people
 * counts twice). The averages are of first and latest scores, so they show the trend.
 */
export function scenarioGroups(scenarioList, rows) {
  const groupsOf = (groups, field) =>
    Object.entries(groups).map(([key, { name }]) => {
      const inGroup = rows.filter((row) => String(row[field]) === key);
      return {
        key,
        name,
        total: scenarioList.filter((scenario) => String(scenario[field]) === key).length,
        run: inGroup.length,
        averageFirst: average(inGroup.map((row) => row.first).filter(hasScore)),
        averageLatest: average(inGroup.map((row) => row.latest).filter(hasScore)),
      };
    });
  return {
    complexity: groupsOf(SCENARIO_COMPLEXITY, 'complexity'),
    load: groupsOf(SCENARIO_LOADS, 'load'),
  };
}

/**
 * Totals for scenario rows: { scenariosRun, runs, averageFirst, averageLatest, improved,
 * declined } (improved and declined count rows whose change is above or below zero).
 */
export function scenarioTotals(rows) {
  return {
    scenariosRun: rows.length,
    runs: rows.reduce((sum, row) => sum + row.runs, 0),
    averageFirst: average(rows.map((row) => row.first).filter(hasScore)),
    averageLatest: average(rows.map((row) => row.latest).filter(hasScore)),
    improved: rows.filter((row) => row.change > 0).length,
    declined: rows.filter((row) => row.change < 0).length,
  };
}

/**
 * The guidelines ticked as struggled in the saved runs (the last 3 per scenario) of these
 * trackers, most often first: [{ id, times, people }]. At most `limit` of them.
 */
export function struggledGuidelines(trackers, limit) {
  const counts = new Map();
  trackers.forEach((tracker, index) => {
    for (const record of Object.values(tracker.scenarios || {})) {
      for (const run of record.runs) {
        for (const id of run.struggled || []) {
          const count = counts.get(id) || { id, times: 0, people: new Set() };
          count.times++;
          count.people.add(index);
          counts.set(id, count);
        }
      }
    }
  });
  return [...counts.values()]
    .sort((a, b) => b.times - a.times || b.people.size - a.people.size || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id, times, people }) => ({ id, times, people: people.size }));
}

/**
 * For each of the six competencies (SC-R), over the saved runs rated on them (the last 3 per
 * scenario) of these trackers: [{ key, name, rated, average }], `rated` the runs that rated it
 * and `average` its ratings as a percentage of the most possible (null when none did). Runs
 * rated on a scenario's outcomes, from before the competencies, are left out.
 */
export function competencyAverages(trackers) {
  const runs = trackers.flatMap((tracker) =>
    Object.values(tracker.scenarios || {}).flatMap((record) =>
      record.runs.filter((run) => run.rated === RATED_ON.COMPETENCIES),
    ),
  );
  return DEBRIEF_COMPETENCIES.map(({ key, name }, index) => {
    const ratings = runs.map((run) => (run.ratings || [])[index]).filter(hasScore);
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    const average = ratings.length
      ? Math.round((total / (ratings.length * DEBRIEF_RATING_TOP)) * 100)
      : null;
    return { key, name, rated: ratings.length, average };
  });
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
 * Completions, quiz scores and scenario scores by week between two times, for the charts.
 * Returns one item per week, empty weeks included: { weekStart, completions, quizCount,
 * quizAverage, scenarioCount, scenarioAverage } (an average is null in a week with nothing to
 * average; scenarioCount counts every run, rated or not). At most MAX_CHART_WEEKS weeks, counted
 * from `from`.
 */
export function weeklySeries(history, from, to) {
  const weeks = new Map();
  let start = weekStart(from);
  while (start <= to && weeks.size < MAX_CHART_WEEKS) {
    weeks.set(start, { weekStart: start, completions: 0, scores: [], runs: 0, runScores: [] });
    start = nextWeekStart(start);
  }
  for (const row of history) {
    const time = row[HISTORY.TIME];
    const week = time >= from && time <= to ? weeks.get(weekStart(time)) : undefined;
    if (!week) continue;
    if (isQuizRow(row)) week.scores.push(row[HISTORY.VALUE]);
    else if (isScenarioRow(row)) {
      week.runs++;
      if (hasScore(row[HISTORY.VALUE])) week.runScores.push(row[HISTORY.VALUE]);
    } else if (isCompletion(row)) week.completions++;
  }
  return [...weeks.values()].map((week) => ({
    weekStart: week.weekStart,
    completions: week.completions,
    quizCount: week.scores.length,
    quizAverage: average(week.scores),
    scenarioCount: week.runs,
    scenarioAverage: average(week.runScores),
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
