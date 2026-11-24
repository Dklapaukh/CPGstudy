/*
 * Editors' reviews (grades) of scenarios, made on the editor page, so later scenarios can be
 * written better (decision 24 Nov 2026). Pure logic: takes and returns data; touches no page,
 * storage or network. Tested in tests/scenarioReviews.test.js.
 *
 * A review is saved in the Sheet's Edits tab beside the edits, one row per scenario and editor,
 * under REVIEW_EDIT_PREFIX + scenario id + '|' + the editor's name made safe, so two editors never
 * overwrite each other and it needs no backend change. Its shape:
 *   { kind: 'scenario-review', scenario, reviewer, at (milliseconds), levels (keys of
 *     SCENARIO_LEVELS), scores { <criterion>: 1 to 3 }, verdict, problems (keys), note }
 * The daily copy (scripts/sync-edits.js) writes them to content/scenario-reviews.yaml, which is
 * read before writing new scenarios. The app never loads them.
 * Depends on constants.js and scenarioEdits.js.
 */
import { SCENARIO_LEVELS } from './constants.js';
import { tidyLevels } from './scenarioEdits.js';

export const REVIEW_EDIT_PREFIX = 'scenario-review|';
export const REVIEW_EDIT_KIND = 'scenario-review';
export const MAX_REVIEW_NOTE = 600;
// The Edits tab's id is at most 120 characters (backend EDIT_ID_PATTERN): the prefix (16), a
// scenario id (at most 60), '|' and the reviewer part, cut to this.
const MAX_REVIEWER_PART = 40;

// What each scenario is graded on, each 1 Poor, 2 OK or 3 Good.
export const REVIEW_CRITERIA = [
  { key: 'realism', name: 'Realistic', help: 'Feels like a real job here: story, people, place' },
  {
    key: 'accuracy',
    name: 'Clinically consistent',
    help: 'History, medicines and vitals fit together and fit the guidelines',
  },
  {
    key: 'teaching',
    name: 'Clear teaching point',
    help: 'The intention and outcomes are clear and can be seen in a run',
  },
  {
    key: 'difficulty',
    name: 'Right difficulty',
    help: 'Fits its complexity, scene load and the levels ticked',
  },
];
export const REVIEW_SCORES = [
  { value: 1, name: 'Poor' },
  { value: 2, name: 'OK' },
  { value: 3, name: 'Good' },
];
// The overall call, needed to save a review.
export const REVIEW_VERDICTS = {
  keep: 'Use as it is',
  tweak: 'Small changes',
  rewrite: 'Needs rewriting',
  remove: 'Take it out',
};
// Common faults, one tap each, so they can be counted across all scenarios.
export const REVIEW_PROBLEMS = {
  'vitals-mismatch': 'Vitals don’t fit the story',
  'too-easy': 'Too easy',
  'too-hard': 'Too hard',
  'thin-story': 'Story too thin',
  'gives-away': 'Gives the answer away',
  'unclear-intention': 'Intention or outcomes unclear',
  'wrong-guidelines': 'Wrong or missing guidelines',
  'not-local': 'Doesn’t feel local',
};

/** The editor's name as it goes in an id: lower case, letters and digits joined by "-". */
const reviewerPart = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_REVIEWER_PART) || 'editor';

/** The Edits-tab id of one editor's review of one scenario. */
export const reviewEditId = (scenarioId, reviewerName) =>
  `${REVIEW_EDIT_PREFIX}${scenarioId}|${reviewerPart(reviewerName)}`;

/** Whether an Edits-tab id is a review's. */
export const isReviewEditId = (id) => String(id).startsWith(REVIEW_EDIT_PREFIX);

const isScore = (value) => REVIEW_SCORES.some((score) => score.value === value);
const isText = (value) => typeof value === 'string';

/**
 * A review with only the keys it may have, each checked, or null when it is not a review (no
 * verdict, a wrong kind). Used by the editor page before saving and by the daily copy.
 */
export function cleanReview(review) {
  if (review?.kind !== REVIEW_EDIT_KIND || !REVIEW_VERDICTS[review.verdict]) return null;
  if (!isText(review.scenario) || !isText(review.reviewer) || !Number.isFinite(review.at)) {
    return null;
  }
  const scores = Object.fromEntries(
    REVIEW_CRITERIA.filter(({ key }) => isScore(review.scores?.[key])).map(({ key }) => [
      key,
      review.scores[key],
    ]),
  );
  const problems = Object.keys(REVIEW_PROBLEMS).filter((key) => review.problems?.includes(key));
  return {
    kind: REVIEW_EDIT_KIND,
    scenario: review.scenario,
    reviewer: review.reviewer,
    at: review.at,
    levels: tidyLevels(review.levels) || [],
    scores,
    verdict: review.verdict,
    problems,
    note: isText(review.note) ? review.note.trim().slice(0, MAX_REVIEW_NOTE) : '',
  };
}

/**
 * A review from what the form holds ({ levels, scores, verdict, problems, note }): { review }, or
 * { error } when no overall call is chosen.
 */
export function readReview(form, scenarioId, reviewerName, at) {
  if (!REVIEW_VERDICTS[form.verdict]) return { error: 'Choose an overall call to save.' };
  const review = cleanReview({
    ...form,
    kind: REVIEW_EDIT_KIND,
    scenario: scenarioId,
    reviewer: reviewerName,
    at,
  });
  return { review };
}

/** The form's starting values: this editor's saved review, or the scenario's own levels. */
export function reviewFormOf(savedReview, scenario) {
  if (savedReview) {
    const { levels, scores, verdict, problems, note } = savedReview;
    return { levels, scores, verdict, problems, note };
  }
  return {
    levels: tidyLevels(scenario?.levels) || [],
    scores: {},
    verdict: '',
    problems: [],
    note: '',
  };
}

/**
 * The next scenario, after `currentId` in `scenarioIds` order and going round, that this editor
 * hasn't reviewed; '' when they have reviewed them all.
 */
export function nextUnreviewed(scenarioIds, edits, reviewerName, currentId = '') {
  const start = scenarioIds.indexOf(currentId) + 1;
  const ordered = [...scenarioIds.slice(start), ...scenarioIds.slice(0, start)];
  return ordered.find((id) => id !== currentId && !edits[reviewEditId(id, reviewerName)]) || '';
}

/** How many of these scenarios this editor has reviewed. */
export const reviewedCount = (scenarioIds, edits, reviewerName) =>
  scenarioIds.filter((id) => edits[reviewEditId(id, reviewerName)]).length;

/** The average of a list of numbers to one decimal place, or null for none. */
const averageOf = (numbers) =>
  numbers.length
    ? Math.round((numbers.reduce((sum, each) => sum + each, 0) / numbers.length) * 10) / 10
    : null;

/** How often each key appears in the lists, most first, as { key: count }; none left out. */
function countsOf(lists, names) {
  const counts = Object.keys(names)
    .map((key) => [key, lists.filter((list) => list.includes(key)).length])
    .filter(([, count]) => count)
    .sort((first, second) => second[1] - first[1]);
  return Object.fromEntries(counts);
}

/** One review as the readable record shows it: names in words, the date as a day. */
const reportedReview = ({ reviewer, at, levels, scores, verdict, problems, note }) => ({
  reviewer,
  date: new Date(at).toISOString().slice(0, 10),
  levels: levels.map((key) => SCENARIO_LEVELS[key].short),
  scores,
  verdict: REVIEW_VERDICTS[verdict],
  problems: problems.map((key) => REVIEW_PROBLEMS[key]),
  note,
});

/** Across every review: how many, the verdicts, the average grade of each criterion, problems. */
function reportSummary(reviews, scenarioCount) {
  const averageScores = Object.fromEntries(
    REVIEW_CRITERIA.map(({ key }) => [
      key,
      averageOf(reviews.map((review) => review.scores[key]).filter(Number.isFinite)),
    ]),
  );
  return {
    reviews: reviews.length,
    scenarios: scenarioCount,
    verdicts: countsOf(
      reviews.map((review) => [review.verdict]),
      REVIEW_VERDICTS,
    ),
    averageScores,
    problems: countsOf(
      reviews.map((review) => review.problems),
      REVIEW_PROBLEMS,
    ),
  };
}

/**
 * The readable record the daily copy writes: the summary, then each reviewed scenario with its
 * title and reviews. `titleOf` gives a scenario's title from its id ('' when gone).
 */
export function reviewReport(reviews, titleOf) {
  const byScenario = {};
  reviews.forEach((review) => {
    byScenario[review.scenario] = [...(byScenario[review.scenario] || []), review];
  });
  const ids = Object.keys(byScenario).sort();
  return {
    summary: reportSummary(reviews, ids.length),
    scenarios: ids.map((id) => ({
      id,
      title: titleOf(id),
      reviews: byScenario[id].map(reportedReview),
    })),
  };
}
