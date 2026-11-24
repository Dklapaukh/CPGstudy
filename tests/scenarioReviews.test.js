// Tests for grading scenarios (src/scenarioReviews.js), the levels a scenario suits
// (src/scenarioEdits.js, src/scenarioLogic.js) and the daily copy of reviews (scripts/sync-edits.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewEditId,
  isReviewEditId,
  cleanReview,
  readReview,
  reviewFormOf,
  nextUnreviewed,
  reviewedCount,
  reviewReport,
  reviewersOf,
  fullyReviewedCount,
} from '../src/scenarioReviews.js';
import {
  tidyLevels,
  readScenarioBox,
  scenarioEditWith,
  applyScenarioEdit,
  scenarioIdOfEdit,
} from '../src/scenarioEdits.js';
import { filterScenarios, levelsInUse } from '../src/scenarioLogic.js';
import { cleanReviews, cleanEdits, cleanScenarioEdits } from '../scripts/sync-edits.js';

const form = {
  levels: ['grad', 'student', 'nonsense'],
  scores: { realism: 3, accuracy: 2, teaching: 9 },
  verdict: 'tweak',
  problems: ['too-easy', 'made-up'],
  note: '  Add a red herring.  ',
  answers: { teaches: ' Long lies ', unsafe: '', made: 'x' },
  otherLevels: ' ICP: add rhabdo ',
  levelNotes: { icp: 'Add rhabdo and hyperkalaemia', nope: 'x' },
};

test('a review id names the scenario and editor, and is never taken for a scenario edit', () => {
  const id = reviewEditId('long-lie', 'Dr Eve O’Neill');
  assert.equal(id, 'scenario-review|long-lie|dr-eve-o-neill');
  assert.ok(isReviewEditId(id));
  assert.equal(scenarioIdOfEdit(id), '');
  assert.ok(id.length <= 120);
  assert.equal(reviewEditId('a', '!!!'), 'scenario-review|a|editor');
});

test('a review needs an overall call; unknown levels, grades and problems are dropped', () => {
  assert.match(readReview({ ...form, verdict: '' }, 'x', 'Eve', 1).error, /overall/);
  const { review } = readReview(form, 'long-lie', 'Eve', 1000);
  assert.deepEqual(review, {
    kind: 'scenario-review',
    scenario: 'long-lie',
    reviewer: 'Eve',
    at: 1000,
    levels: ['student', 'grad'],
    scores: { realism: 3, accuracy: 2 },
    verdict: 'tweak',
    problems: ['too-easy'],
    note: 'Add a red herring.',
    answers: { teaches: 'Long lies' },
    otherLevels: 'ICP: add rhabdo',
    levelNotes: { icp: 'Add rhabdo and hyperkalaemia' },
  });
  assert.equal(cleanReview({ ...review, kind: 'scenario' }), null);
  assert.equal(cleanReview({ ...review, at: 'today' }), null);
});

test('the form starts from your saved review, or from the levels the scenario has', () => {
  const { review } = readReview(form, 'long-lie', 'Eve', 1000);
  assert.deepEqual(reviewFormOf(review, {}).levels, ['student', 'grad']);
  assert.deepEqual(reviewFormOf(null, { levels: ['icp'] }), {
    levels: ['icp'],
    scores: {},
    verdict: '',
    problems: [],
    note: '',
    answers: {},
    otherLevels: '',
    levelNotes: {},
  });
});

test('"next" goes round the list to one you haven’t reviewed, and counts what you have', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const edits = { [reviewEditId('b', 'Eve')]: {}, [reviewEditId('c', 'Sam')]: {} };
  assert.equal(nextUnreviewed(ids, edits, 'Eve'), 'a');
  assert.equal(nextUnreviewed(ids, edits, 'Eve', 'a'), 'c');
  assert.equal(nextUnreviewed(ids, edits, 'Eve', 'd'), 'a');
  assert.equal(reviewedCount(ids, edits, 'Eve'), 1);
  const all = Object.fromEntries(ids.map((id) => [reviewEditId(id, 'Eve'), {}]));
  assert.equal(nextUnreviewed(ids, all, 'Eve', 'a'), '');
});

test('the report sums verdicts, grades and problems, then lists each scenario’s reviews', () => {
  const first = readReview(form, 'long-lie', 'Eve', Date.UTC(2026, 10, 24)).review;
  const second = readReview(
    { levels: [], scores: { realism: 2 }, verdict: 'keep', problems: ['too-easy'], note: '' },
    'long-lie',
    'Sam',
    Date.UTC(2026, 10, 25),
  ).review;
  const titleOf = (id) => (id === 'long-lie' ? 'Long lie' : '');
  const report = reviewReport([first, second], { titleOf });
  assert.deepEqual(report.summary, {
    reviews: 2,
    scenarios: 1,
    goal: '3 editors per scenario',
    scenariosAtGoal: 0,
    reviewers: { Eve: 1, Sam: 1 },
    verdicts: { keep: 1, tweak: 1 },
    averageScores: { realism: 2.5, accuracy: 2, teaching: null, difficulty: null },
    problems: { 'too-easy': 2 },
  });
  assert.equal(report.scenarios[0].title, 'Long lie');
  assert.deepEqual(report.scenarios[0].reviews[0], {
    reviewer: 'Eve',
    date: '2026-11-24',
    levels: ['Student', 'Grad'],
    scores: { realism: 3, accuracy: 2 },
    verdict: 'Small changes',
    problems: ['Too easy'],
    note: 'Add a red herring.',
    answers: { 'What does it teach best?': 'Long lies' },
    otherLevels: 'ICP: add rhabdo',
    levelNotes: { ICP: 'Add rhabdo and hyperkalaemia' },
  });
  assert.equal(report.scenarios[0].reviewers, 2);
  assert.deepEqual(report.levelNotes, { ICP: ['long-lie (Eve): Add rhabdo and hyperkalaemia'] });
});

test('who reviewed a scenario, and how many scenarios have three editors’ reviews', () => {
  const edits = {};
  ['Eve', 'Sam', 'Ana'].forEach((name, index) => {
    edits[reviewEditId('a', name)] = { kind: 'scenario-review', reviewer: name, at: index };
  });
  edits[reviewEditId('b', 'Eve')] = { kind: 'scenario-review', reviewer: 'Eve', at: 5 };
  edits[reviewEditId('ab', 'Sam')] = { kind: 'scenario-review', reviewer: 'Sam', at: 6 };
  assert.deepEqual(reviewersOf('a', edits), ['Eve', 'Sam', 'Ana']);
  assert.deepEqual(reviewersOf('b', edits), ['Eve'], 'not confused with "ab"');
  assert.equal(fullyReviewedCount(['a', 'b', 'ab'], edits), 1);
});

test('the daily copy keeps whole reviews apart from question and scenario edits', () => {
  const { review } = readReview(form, 'long-lie', 'Eve', 1000);
  const edits = {
    [reviewEditId('long-lie', 'Eve')]: review,
    [reviewEditId('long-lie', 'Sam')]: { kind: 'scenario-review' },
    'scenario|long-lie': { kind: 'scenario', fields: { title: { to: 'x' } } },
  };
  assert.deepEqual(cleanReviews(edits), [review]);
  assert.deepEqual(cleanEdits(edits), {});
  assert.deepEqual(Object.keys(cleanScenarioEdits(edits)), ['scenario|long-lie']);
});

test('levels: typed as words, kept lowest first; empty means none and is no change', () => {
  assert.deepEqual(
    readScenarioBox('levels', 'ICP, grad\nStudent', () => ''),
    {
      value: ['student', 'grad', 'icp'],
    },
  );
  assert.deepEqual(
    readScenarioBox('levels', 'Supervised paramedic', () => ''),
    {
      value: ['supervised'],
    },
  );
  assert.match(readScenarioBox('levels', 'consultant', () => '').error, /student, grad/);
  assert.deepEqual(
    readScenarioBox('levels', '', () => ''),
    { value: [] },
  );
  assert.equal(tidyLevels(['nope']), undefined);
  const scenario = { id: 'x', title: 'X', patients: [] };
  assert.equal(scenarioEditWith(scenario, null, 'levels', []), null);
  const edit = scenarioEditWith(scenario, null, 'levels', ['grad']);
  assert.deepEqual(applyScenarioEdit(scenario, edit).levels, ['grad']);
});

test('levels: the list offers only levels in use and filters by the one chosen', () => {
  const scenarios = [
    { id: 'a', levels: ['student', 'grad'], guidelines: [] },
    { id: 'b', levels: ['icp'], guidelines: [] },
    { id: 'c', guidelines: [] },
  ];
  assert.deepEqual(levelsInUse(scenarios), ['student', 'grad', 'icp']);
  const shown = filterScenarios(scenarios, { level: 'grad' }, () => '');
  assert.deepEqual(
    shown.map((scenario) => scenario.id),
    ['a'],
  );
  assert.equal(filterScenarios(scenarios, { level: '' }, () => '').length, 3);
});
