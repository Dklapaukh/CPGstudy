/*
 * Tests for the manager page: the sums (src/manager/stats.js), the chart markup, and the whole
 * page in a simulated browser (jsdom) with a fake backend.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  historyFor,
  statusCounts,
  sectionCounts,
  attemptCounts,
  quizRows,
  flashcardTotals,
  teamRow,
  generalStats,
  weekStart,
  weeklySeries,
  earliestTime,
  dateInputValue,
  parseDateInput,
  MAX_CHART_WEEKS,
  withScenarioRuns,
  scenarioRows,
  scenarioGroups,
  scenarioTotals,
  struggledGuidelines,
} from '../src/manager/stats.js';
import { chartSvg, CHART_KIND } from '../src/manager/chart.js';

const DAY = 24 * 3600e3;
// Local times, so the tests pass in any time zone. 16 Nov 2026 is a Monday.
const monday = new Date(2026, 10, 16).getTime();
const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();

const guidelineList = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const quizzed = [
  { id: 'a', number: '2.1', title: 'Asthma' },
  { id: 'b', number: '2.2', title: 'COPD' },
];
const sam = {
  label: 'Sam',
  lastActive: at(18),
  statuses: { a: 'c', b: 'v', gone: 'c' },
  marked: {},
  quizzes: {
    a: { best: 90, at: at(3), last: 70, lastAt: at(17) },
    gone: { best: 100, at: at(3), last: 100, lastAt: at(3) },
  },
  flashcards: {
    m1: [
      [10, 3],
      [5, 0],
    ],
    m2: [[20, 6]],
  },
};
const history = [
  [0, 'a', 'v', at(2), 1],
  [0, 'a', 'c', at(10), 0],
  [0, 'quiz-order-a', 90, at(3), 1],
  [0, 'quiz-order-a', 50, at(10), 0],
  [0, 'quiz-order-a', 70, at(17), 0],
  [1, 'b', 'c', at(17), 0],
  [1, 'quiz-order-b', 100, at(17), 0],
];

test('status counts: anything not marked is incomplete; sections are counted one by one', () => {
  assert.deepEqual(statusCounts(guidelineList, sam.statuses), {
    incomplete: 1,
    review: 1,
    complete: 1,
    total: 3,
  });
  const sections = [
    { name: 'One', items: [{ id: 'a' }] },
    { name: 'Two', items: [{ id: 'b' }, { id: 'c' }] },
  ];
  assert.deepEqual(
    sectionCounts(sections, sam.statuses).map((s) => [s.name, s.complete, s.total]),
    [
      ['One', 1, 1],
      ['Two', 0, 2],
    ],
  );
});

test('quizzes: attempts leave out back-filled rows; rows follow guideline order', () => {
  const mine = historyFor(history, 0);
  assert.equal(mine.length, 5);
  assert.equal(historyFor(history, null).length, history.length);
  assert.deepEqual(attemptCounts(mine), { a: 2 });
  assert.deepEqual(quizRows(quizzed, sam.quizzes, mine), [
    {
      id: 'a',
      number: '2.1',
      title: 'Asthma',
      last: 70,
      lastAt: at(17),
      best: 90,
      bestAt: at(3),
      attempts: 2,
    },
  ]);
});

test('flashcards: learnt has an interval of a day or more; due is today or earlier', () => {
  assert.deepEqual(flashcardTotals(sam.flashcards, 415, 10), {
    started: 3,
    learnt: 2,
    due: 2,
    total: 415,
  });
  assert.deepEqual(flashcardTotals({}, 415, 10), { started: 0, learnt: 0, due: 0, total: 415 });
});

test('team row and general numbers', () => {
  assert.deepEqual(teamRow(sam, { studyGuidelines: guidelineList, quizzed }), {
    label: 'Sam',
    incomplete: 1,
    review: 1,
    complete: 1,
    total: 3,
    quizzesDone: 1,
    quizzesTotal: 2,
    scenariosRun: 0,
    scenarioLatest: null,
    lastActive: at(18),
  });
  const general = generalStats(sam, historyFor(history, 0), at(16));
  assert.equal(general.completionsLast7Days, 1);
  assert.equal(general.completionsLast30Days, 1);
  assert.equal(general.quizPlaysRecorded, 2);
  assert.equal(general.averageLatestScore, 85);
  assert.equal(generalStats({ ...sam, quizzes: {} }, [], at(16)).averageBestScore, null);
});

const scenarioList = [
  { id: 'ankle', title: 'Ankle', complexity: 1, load: 'single' },
  { id: 'crash', title: 'Crash', complexity: 3, load: 'several' },
  { id: 'chest', title: 'Chest', complexity: 2, load: 'single' },
];
// Ankle: 5 runs in all, the first two logged before History had runs (only the last 3 kept).
const runner = {
  scenarios: {
    ankle: {
      count: 5,
      runs: [
        { at: at(20), ratings: [3, 3, 3], struggled: [] },
        { at: at(12), ratings: [], struggled: ['g1'] },
        { at: at(4), ratings: [1, 1, null], struggled: ['g1', 'g2'] },
      ],
    },
    crash: { count: 1, runs: [{ at: at(18), ratings: [2, 0, 1], struggled: ['g1'] }] },
    gone: { count: 1, runs: [{ at: at(5), ratings: [3], struggled: ['g9'] }] },
  },
};
const runHistory = [[0, 'scenario-run-ankle', 100, at(20), 0]];

test('scenarios: saved runs fill History gaps; rows show first, latest and change', () => {
  const merged = withScenarioRuns(runHistory, [runner]);
  assert.equal(merged.length, 5, 'the logged run is not added twice');
  assert.deepEqual(
    merged.filter((row) => row[1] === 'scenario-run-ankle').map((row) => row[2]),
    [100, null, 33],
  );
  const rows = scenarioRows(scenarioList, runner, merged);
  assert.deepEqual(
    rows.map((row) => [row.id, row.runs, row.first, row.latest, row.best, row.change]),
    [
      ['ankle', 5, 33, 100, 100, 67],
      ['crash', 1, 33, 33, 33, null],
    ],
  );
  assert.deepEqual(rows[1].struggled, ['g1']);
  assert.deepEqual(scenarioTotals(rows), {
    scenariosRun: 2,
    runs: 6,
    averageFirst: 33,
    averageLatest: 67,
    improved: 1,
    declined: 0,
  });
  const groups = scenarioGroups(scenarioList, rows);
  assert.deepEqual(
    groups.complexity.map((g) => [g.key, g.total, g.run, g.averageFirst, g.averageLatest]),
    [
      ['1', 1, 1, 33, 100],
      ['2', 1, 0, null, null],
      ['3', 1, 1, 33, 33],
    ],
  );
  assert.deepEqual(
    groups.load.map((g) => [g.key, g.run]),
    [
      ['single', 1],
      ['delegation', 0],
      ['several', 1],
    ],
  );
  assert.deepEqual(scenarioRows(scenarioList, { scenarios: undefined }, []), []);
  const [week] = weeklySeries(merged, monday, at(22, 23));
  assert.deepEqual([week.scenarioCount, week.scenarioAverage], [2, 67]);
});

test('scenarios: struggled guidelines are counted over saved runs, most often first', () => {
  const other = {
    scenarios: { crash: { count: 1, runs: [{ at: 1, ratings: [], struggled: ['g2'] }] } },
  };
  assert.deepEqual(struggledGuidelines([runner, other], 2), [
    { id: 'g1', times: 3, people: 1 },
    { id: 'g2', times: 2, people: 2 },
  ]);
});

test('weeks start on Monday, empty weeks are kept, and rows outside the range are left out', () => {
  assert.equal(weekStart(at(22, 23)), monday);
  assert.equal(weekStart(monday), monday);
  assert.equal(weekStart(monday - 1), monday - 7 * DAY);
  const weeks = weeklySeries(history, at(3, 0), at(22, 23));
  assert.deepEqual(
    weeks.map((week) => [new Date(week.weekStart).getDate(), week.completions, week.quizAverage]),
    [
      [2, 0, 90],
      [9, 1, 50],
      [16, 1, 85],
    ],
  );
  assert.equal(weeks[2].quizCount, 2);
  assert.equal(weeklySeries(historyFor(history, 1), at(3, 0), at(22, 23))[0].quizAverage, null);
  assert.equal(weeklySeries([], 0, Date.now()).length, MAX_CHART_WEEKS);
  assert.deepEqual(weeklySeries(history, at(20), at(10)), []);
});

test('date boxes: text to local time and back; bad text is null', () => {
  assert.equal(dateInputValue(at(5)), '2026-11-05');
  assert.equal(parseDateInput('2026-11-05'), new Date(2026, 10, 5).getTime());
  assert.equal(parseDateInput('2026-11-05', true), new Date(2026, 10, 6).getTime() - 1);
  assert.equal(parseDateInput('5 Nov'), null);
  assert.equal(earliestTime(history, 7), at(2));
  assert.equal(earliestTime([], 7), 7);
});

test('chart: one mark per week with a value, escaped text, and gaps left open in a line', () => {
  const points = [
    { label: '2 Nov', value: 80, tip: 'Week of 2 Nov: <b>80%</b>' },
    { label: '9 Nov', value: null, tip: 'no quiz' },
    { label: '16 Nov', value: 60, tip: 'x' },
    { label: '23 Nov', value: 40, tip: 'y' },
  ];
  const line = chartSvg({ points, kind: CHART_KIND.LINE, title: 'A & B', unit: '%', max: 100 });
  assert.equal(line.match(/chart__dot/g).length, 3);
  assert.equal(line.match(/chart__line/g).length, 1);
  assert.ok(line.includes('aria-label="A &amp; B"') && line.includes('&lt;b&gt;80%'));
  assert.ok(line.includes('>100%</text>'));
  const bars = chartSvg({
    points: [
      { label: 'a', value: 0, tip: '' },
      { label: 'b', value: 5, tip: '' },
    ],
    kind: CHART_KIND.BARS,
    title: 't',
  });
  assert.equal(bars.match(/chart__bar/g).length, 1);
  assert.ok(bars.includes('>8</text>')); // the axis tops out at a round number above 5
  assert.equal(/NaN|undefined/.test(bars + line), false);
  assert.equal(/NaN/.test(chartSvg({ points: [], kind: CHART_KIND.BARS, title: 't' })), false);
});

/* ---------- The whole page ---------- */

const requests = [];
let dom;
let doc;
let signalWorks = true;
const now = Date.now();
const reply = {
  ok: true,
  role: 'manager',
  name: 'Rua',
  trackers: [
    {
      ...sam,
      label: 'Sam <2026>',
      statuses: { 'cpg-2-1': 'c', 'cpg-2-2': 'v' },
      quizzes: {},
      scenarios: {
        'netball-ankle': {
          count: 2,
          runs: [
            { at: now - DAY, ratings: [3, 3, 3], struggled: ['cpg-2-1'] },
            { at: now - DAY - 1000, ratings: [1, 1, 1], struggled: [] },
          ],
        },
      },
    },
    { label: 'Alex', lastActive: 0, statuses: {}, marked: {}, quizzes: {}, flashcards: {} },
  ],
  history: [
    [0, 'cpg-2-1', 'c', now - DAY, 0],
    [0, 'quiz-order-cpg-2-1', 75, now - DAY, 0],
    [0, 'scenario-run-netball-ankle', 100, now - DAY, 0],
  ],
};
// 'old-backend' stands for a backend address still running code from before the manager view.
const backendReply = (code) => {
  if (code === 'manager-1') return reply;
  return { ok: false, error: code === 'old-backend' ? 'bad-action' : 'not-found' };
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = (selector) => doc.querySelector(selector);
const click = (element) => element.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

before(() => {
  const html = readFileSync('manager.html', 'utf8').replace(/<script[^>]*><\/script>/, '');
  dom = new JSDOM(html, { url: 'https://example.test/manager.html', pretendToBeVisual: true });
  doc = dom.window.document;
  dom.window.scrollTo = () => {};
  const globals = {
    window: dom.window,
    document: doc,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    location: dom.window.location,
    fetch: async (url, options) => {
      if (!signalWorks) throw new Error('offline');
      const body = JSON.parse(options.body);
      requests.push(body);
      return {
        json: async () => backendReply(body.code),
      };
    },
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  });
});

async function signIn(code) {
  $('#manager-passcode').value = code;
  click($('[data-action="sign-in"]'));
  await sleep(20);
}

test('page: a wrong passcode shows the message; the right one shows the team table', async () => {
  await import('../src/manager/main.js');
  await signIn('nope');
  assert.match($('.warning-message').textContent, /wasn’t recognised/);
  await signIn('manager-1');
  assert.deepEqual(requests.at(-1), { action: 'stats', code: 'manager-1' });
  const rows = [...doc.querySelectorAll('.stats-table tbody tr')];
  assert.deepEqual(
    rows.slice(0, 2).map((row) => row.querySelector('th').textContent),
    ['Alex', 'Sam <2026>'],
  );
  assert.equal(doc.querySelector('.person-link[href="#person-0"]').textContent, 'Sam <2026>');
  assert.match(rows[1].textContent, /1\s*1\s*\d+ of \d+/);
  assert.equal(doc.querySelectorAll('svg.chart').length, 3);
  assert.match(rows[1].textContent, /1\s*100%/, 'scenarios run and latest score');
  assert.match($('main').textContent, /Average first score\s*33%/);
});

test('page: a person page has every part, and the date range redraws the charts', async () => {
  dom.window.location.hash = '#person-0';
  await sleep(20);
  assert.equal($('.person-name').textContent, 'Sam <2026>');
  const titles = [...doc.querySelectorAll('.section-title')].map((title) => title.textContent);
  assert.deepEqual(titles, [
    'Guidelines',
    'Guideline quizzes',
    'Medicines',
    'Scenarios',
    'General',
    'Over time',
  ]);
  assert.match($('main').textContent, /Flashcards learnt\s*2 of \d+/);
  assert.equal(doc.querySelectorAll('.chart__bar').length, 1);
  assert.equal(doc.querySelectorAll('.chart__dot').length, 2, 'a quiz dot and a scenario dot');
  assert.match($('main').textContent, /Netball ankle\s*Simple\s*Single\s*2\s*33%\s*100%\s*\+67/);
  assert.equal($('main').textContent.includes('secret'), false);
  $('#range-to').value = dateInputValue(now - 30 * DAY);
  $('#range-to').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(doc.querySelectorAll('.chart__bar').length, 0);
  click($('[data-action="range-all"]'));
  assert.equal(doc.querySelectorAll('.chart__bar').length, 1);
});

test('page: a failed refresh keeps the numbers; sign out clears them and the passcode', async () => {
  signalWorks = false;
  click($('[data-action="refresh"]'));
  await sleep(20);
  assert.match($('.warning-message').textContent, /Couldn’t reach the server/);
  assert.ok($('.person-name'));
  assert.equal(dom.window.sessionStorage.getItem('eas-cpg-manager-v1'), 'manager-1');
  click($('[data-action="sign-out"]'));
  assert.ok($('#manager-passcode'));
  assert.equal(dom.window.sessionStorage.getItem('eas-cpg-manager-v1'), null);
  assert.equal(doc.body.textContent.includes('Sam'), false);
});

test('page: a backend without the "stats" action says to redeploy, not "Something went wrong"', async () => {
  signalWorks = true;
  await signIn('old-backend');
  assert.match($('.warning-message').textContent, /older version of the backend/);
  assert.match($('.warning-message').textContent, /Manage deployments/);
  assert.ok($('#manager-passcode'));
});
