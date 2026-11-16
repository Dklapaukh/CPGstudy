// Tests for backend/Code.gs, run against a stand-in for the Google Sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('backend/Code.gs', 'utf8');
const tabs = {
  Mentors: [
    ['Name', 'Passcode'],
    ['Mia', 'Boss-1'],
  ],
  Trackers: [
    ['Label', 'Passcode', 'By', 'Created'],
    ['Sam', 'tracker-1', 'Mia', 'x'],
  ],
  Data: [['Key', 'P', 'G', 'S', 'N', 'U']],
};
let sleeps = 0;

/** A stand-in for one tab. Ranges are addressed like the real ones: a column name or numbers. */
function fakeSheet(name) {
  const rows = tabs[name];
  return {
    getDataRange: () => ({ getValues: () => rows }),
    getLastRow: () => rows.length,
    appendRow: (row) => rows.push(row),
    setFrozenRows() {},
    getRange: (row, column, rowCount = 1) => {
      if (row === 'A:A') {
        return {
          createTextFinder: (key) => ({
            matchEntireCell: () => ({
              findNext: () => {
                const i = rows.findIndex((cells, index) => index > 0 && cells[0] === key);
                return i < 0 ? null : { getRow: () => i + 1 };
              },
            }),
          }),
        };
      }
      if (typeof row === 'string') return { setNumberFormat() {} };
      return {
        getValues: () =>
          rows.slice(row - 1, row - 1 + rowCount).map((cells) => cells.slice(column - 1)),
        setValues: (values) =>
          values.forEach((cells, i) => {
            if (!rows[row - 1 + i]) rows[row - 1 + i] = [];
            cells.forEach((value, j) => (rows[row - 1 + i][column - 1 + j] = value));
          }),
      };
    },
  };
}

const spreadsheet = {
  getSheetByName: (name) => (tabs[name] ? fakeSheet(name) : null),
  insertSheet: (name) => {
    tabs[name] = [];
    return fakeSheet(name);
  },
};

const environment = {
  SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: {
    createTextOutput: (text) => ({
      text,
      setMimeType() {
        return this;
      },
    }),
    MimeType: { JSON: 1 },
  },
  Utilities: { sleep: () => sleeps++ },
  console: { error() {} },
};
const { doGet, doPost, setup } = new Function(
  ...Object.keys(environment),
  `${source}; return { doGet, doPost, setup };`,
)(...Object.values(environment));
const post = (body) => JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } }).text);

test('opening the backend address says which version is live, so a redeploy can be checked', () => {
  assert.match(doGet().text, /running, version with the manager view \(16 Nov 2026\)/);
});

test('open: tracker, mentor, and a wrong passcode that is delayed after the lock', () => {
  assert.deepEqual(
    { role: post({ action: 'open', code: ' TRACKER-1 ' }).role },
    { role: 'tracker' },
  );
  assert.equal(post({ action: 'open', code: 'boss-1' }).name, 'Mia');
  const before = sleeps;
  const wrong = post({ action: 'open', code: 'nope' });
  assert.equal(wrong.error, 'not-found');
  assert.equal(sleeps, before + 1);
  assert.equal('delayBeforeReply' in wrong, false);
});

test('the placeholder mentor passcode is refused even when it is in the Sheet (C4)', () => {
  tabs.Mentors.push(['Your name', 'change-this-to-a-long-passcode']);
  const placeholder = { code: 'Change-this-to-a-long-passcode' };
  assert.equal(post({ action: 'open', ...placeholder }).error, 'placeholder-passcode');
  assert.equal(
    post({ action: 'create', label: 'Sam', ...placeholder }).error,
    'placeholder-passcode',
  );
  tabs.Mentors.pop();
});

test('save: bad ids ignored, future times cut back, older edits lose', () => {
  const now = Date.now();
  const first = post({
    action: 'save',
    code: 'tracker-1',
    changes: [
      { id: 'g1', s: 'c', n: 'hi', t: now + 3600e3 },
      { id: 'bad id', s: 'c' },
    ],
  });
  assert.equal(first.saved, 1);
  assert.ok(first.data.g1.t <= Date.now() + 5 * 60 * 1000);
  const older = post({
    action: 'save',
    code: 'tracker-1',
    changes: [{ id: 'g1', s: 'v', n: 'old', t: 1 }],
  });
  assert.equal(older.saved, 0);
  assert.equal(older.data.g1.n, 'hi');
});

test('create: only mentors can; unknown actions and bad requests give generic errors', () => {
  const made = post({ action: 'create', code: 'boss-1', label: 'Alex' });
  assert.match(made.code, /^[a-z]+-[a-z]+-[a-z]+-\d\d$/);
  assert.equal(post({ action: 'create', code: 'tracker-1', label: 'x' }).error, 'not-mentor');
  assert.equal(post({ action: 'zzz', code: 'tracker-1' }).error, 'bad-action');
  assert.deepEqual(JSON.parse(doPost({ postData: { contents: 'not json' } }).text), {
    ok: false,
    error: 'server-error',
  });
});

/* ---------- Manager page: History and the "stats" action ---------- */

const DAY = 24 * 3600e3;
const historyOf = (code) => tabs.History.filter((row) => row[0] === code);

test('setup: adds the new tabs and back-fills History once from marked dates and scores', () => {
  const start = Date.now() - 30 * DAY;
  const quizNote = JSON.stringify({ best: 90, at: start, last: 60, lastAt: start + DAY });
  tabs.Trackers.push(['Old', 'old-1', 'Mia', 'x']);
  tabs.Data.push(
    ['old-1|cpg-2-1', 'old-1', 'cpg-2-1', 'c', 'private note', start],
    ['old-1|marked-cpg-2-1', 'old-1', 'marked-cpg-2-1', 'i', String(start), start],
    ['old-1|marked-cpg-2-2', 'old-1', 'marked-cpg-2-2', 'i', String(start), start],
    ['old-1|quiz-order-cpg-2-1', 'old-1', 'quiz-order-cpg-2-1', 'i', quizNote, start],
  );
  setup();
  assert.deepEqual(tabs.Managers, [['Name', 'Passcode']]);
  assert.deepEqual(tabs.Assignments, [['Viewer name', 'Tracker label']]);
  assert.deepEqual(historyOf('old-1'), [
    ['old-1', 'cpg-2-1', 'c', start, 'back-fill'],
    ['old-1', 'quiz-order-cpg-2-1', 90, start, 'back-fill'],
    ['old-1', 'quiz-order-cpg-2-1', 60, start + DAY, 'back-fill'],
  ]);
  setup();
  assert.equal(historyOf('old-1').length, 3);
});

test('save: History gets status changes and quiz plays, and never a note', () => {
  const now = Date.now();
  const save = (changes) => post({ action: 'save', code: 'tracker-1', changes });
  const before = historyOf('tracker-1').length;
  save([{ id: 'cpg-3-1', s: 'v', n: 'secret', t: now }]);
  save([{ id: 'cpg-3-1', s: 'v', n: 'secret, edited', t: now + 1 }]); // notes only: no row
  save([{ id: 'cpg-3-1', s: 'c', n: 'secret, edited', t: now + 2 }]);
  save([{ id: 'cpg-3-2', s: 'i', n: 'a note on an untouched guideline', t: now }]);
  const play = (last, lastAt) => ({
    id: 'quiz-order-cpg-3-1',
    s: 'i',
    n: JSON.stringify({ best: 80, at: now, last, lastAt }),
    t: lastAt,
  });
  save([play(80, now)]);
  save([play(80, now)]); // the same play uploaded twice: one row
  save([play(50, now + 5)]);
  save([{ id: 'quiz-cpg-14-1', s: 'i', n: '{"Dose":[1,1,250,1,0,1]}', t: now }]);
  assert.deepEqual(historyOf('tracker-1').slice(before), [
    ['tracker-1', 'cpg-3-1', 'v', now, ''],
    ['tracker-1', 'cpg-3-1', 'c', now + 2, ''],
    ['tracker-1', 'quiz-order-cpg-3-1', 80, now, ''],
    ['tracker-1', 'quiz-order-cpg-3-1', 50, now + 5, ''],
  ]);
  assert.equal(JSON.stringify(tabs.History).includes('secret'), false);
});

test('stats: a manager sees assigned trackers only, as numbers with no notes or passcodes', () => {
  tabs.Managers.push(['Rua', 'Manager-1']);
  tabs.Assignments.push(['rua ', ' SAM'], ['Someone else', 'Old']);
  const reply = post({ action: 'stats', code: 'manager-1' });
  assert.deepEqual([reply.role, reply.name, reply.trackers.length], ['manager', 'Rua', 1]);
  const [sam] = reply.trackers;
  assert.equal(sam.label, 'Sam');
  assert.equal(sam.statuses['cpg-3-1'], 'c');
  assert.equal('cpg-3-2' in sam.statuses, false);
  assert.deepEqual(Object.keys(sam.quizzes), ['cpg-3-1']);
  assert.equal(sam.quizzes['cpg-3-1'].last, 50);
  assert.deepEqual(sam.flashcards, { 'cpg-14-1': [[1, 1]] });
  assert.ok(sam.lastActive > 0);
  assert.ok(reply.history.length >= 4);
  assert.ok(reply.history.every((row) => row[0] === 0 && row.length === 5));
  const text = JSON.stringify(reply);
  for (const hidden of ['secret', 'note', 'tracker-1', 'old-1', 'Dose']) {
    assert.equal(text.includes(hidden), false, hidden);
  }
});

test('stats: a mentor also sees trackers they created; other passcodes are refused', () => {
  const mentor = post({ action: 'stats', code: 'boss-1' });
  assert.equal(mentor.role, 'mentor');
  const labels = mentor.trackers.map((tracker) => tracker.label);
  assert.ok(labels.includes('Sam') && labels.includes('Old'));
  const old = mentor.trackers[labels.indexOf('Old')];
  assert.deepEqual(old.marked, {
    'cpg-2-1': old.marked['cpg-2-1'],
    'cpg-2-2': old.marked['cpg-2-2'],
  });
  const backfilled = mentor.history.filter((row) => row[4] === 1);
  assert.equal(backfilled.length, 3);
  const before = sleeps;
  assert.equal(post({ action: 'stats', code: 'tracker-1' }).error, 'not-found');
  assert.equal(sleeps, before + 1);
  assert.equal(post({ action: 'open', code: 'manager-1' }).error, 'not-found');
});
