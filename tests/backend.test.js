// Tests for backend/Code.gs, run against a stand-in for the Google Sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('backend/Code.gs', 'utf8');
const tabs = {
  // An old Mentors tab is left in the Sheet: its passcodes must no longer open anything.
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
const emails = [];
const cacheValues = {};
const properties = {};
const driveFolders = [];
const driveFiles = [];

/** A stand-in for a Drive folder: files made in it are kept in driveFiles. */
function fakeFolder(id) {
  return {
    getId: () => id,
    createFile: (blob) => {
      const file = { id: `file-${driveFiles.length + 1}`, folder: id, blob };
      driveFiles.push(file);
      return { setDescription: (text) => (file.description = text), getId: () => file.id };
    },
  };
}

/** A stand-in for one tab. Ranges are addressed like the real ones: a column name or numbers. */
function fakeSheet(name) {
  const rows = tabs[name];
  return {
    getDataRange: () => ({ getValues: () => rows }),
    getLastRow: () => rows.length,
    appendRow: (row) => rows.push(row),
    deleteRow: (row) => rows.splice(row - 1, 1),
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
  Utilities: {
    sleep: () => sleeps++,
    base64Decode: (text) => Buffer.from(text, 'base64'),
    base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
    newBlob: (bytes, type, name) => ({ bytes, type, name }),
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => properties[key] ?? null,
      setProperty: (key, value) => (properties[key] = value),
    }),
  },
  DriveApp: {
    createFolder: (name) => fakeFolder(`folder-${driveFolders.push(name)}`),
    getFolderById: (id) => fakeFolder(id),
    getFileById: (id) => {
      const file = driveFiles.find((each) => each.id === id);
      return {
        getBlob: () => ({ getBytes: () => file.blob.bytes }),
        setTrashed: (trashed) => (file.trashed = trashed),
      };
    },
  },
  CacheService: {
    getScriptCache: () => ({
      get: (key) => cacheValues[key] ?? null,
      put: (key, value) => (cacheValues[key] = value),
    }),
  },
  MailApp: { sendEmail: (to, subject, body) => emails.push({ to, subject, body }) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  console: { error() {} },
};
const { doGet, doPost, setup } = new Function(
  ...Object.keys(environment),
  `${source}; return { doGet, doPost, setup };`,
)(...Object.values(environment));
const post = (body) => JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } }).text);

test('opening the backend address says which version is live, so a redeploy can be checked', () => {
  assert.match(doGet().text, /running, version with scenario runs and submissions \(19 Nov 2026\)/);
});

test('open: a tracker, and a wrong or old mentor passcode that is delayed after the lock', () => {
  assert.deepEqual(
    { role: post({ action: 'open', code: ' TRACKER-1 ' }).role },
    { role: 'tracker' },
  );
  assert.equal(post({ action: 'open', code: 'boss-1' }).error, 'not-found');
  const before = sleeps;
  const wrong = post({ action: 'open', code: 'nope' });
  assert.equal(wrong.error, 'not-found');
  assert.equal(sleeps, before + 1);
  assert.equal('delayBeforeReply' in wrong, false);
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

test('unknown actions, the removed create action and bad requests give generic errors', () => {
  assert.equal(post({ action: 'create', code: 'boss-1', label: 'Alex' }).error, 'bad-action');
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

test('stats: a manager sees back-filled History; tracker and old mentor passcodes are refused', () => {
  tabs.Managers.push(['Kai', 'Manager-2']);
  tabs.Assignments.push(['Kai', 'Old']);
  const kai = post({ action: 'stats', code: 'manager-2' });
  const labels = kai.trackers.map((tracker) => tracker.label);
  assert.deepEqual(labels, ['Old'], 'assigned trackers only');
  const old = kai.trackers[0];
  assert.deepEqual(old.marked, {
    'cpg-2-1': old.marked['cpg-2-1'],
    'cpg-2-2': old.marked['cpg-2-2'],
  });
  const backfilled = kai.history.filter((row) => row[4] === 1);
  assert.equal(backfilled.length, 3);
  assert.equal(post({ action: 'stats', code: 'boss-1' }).error, 'not-found');
  const before = sleeps;
  assert.equal(post({ action: 'stats', code: 'tracker-1' }).error, 'not-found');
  assert.equal(sleeps, before + 1);
  assert.equal(post({ action: 'open', code: 'manager-1' }).error, 'not-found');
});

test('scenario runs: each new run is logged with its score; stats send numbers, never debrief text', () => {
  const now = Date.now();
  const record = (runs, count) =>
    JSON.stringify({
      count,
      runs: runs.map(([at, ratings]) => ({
        at,
        ratings,
        struggled: ['cpg-2-1'],
        plus: 'secret plus',
        delta: 'secret delta',
        takeaway: 'secret takeaway',
      })),
    });
  const save = (n, t) =>
    post({ action: 'save', code: 'tracker-1', changes: [{ id: 'scenario-run-x', s: 'i', n, t }] });
  const before = historyOf('tracker-1').length;
  save(record([[now, [3, 2, null]]], 1), now);
  save(record([[now, [3, 2, null]]], 1), now + 1); // the same run uploaded again: no row
  // Two runs saved while offline, then uploaded together: both logged, oldest first.
  save(
    record(
      [
        [now + 20, []],
        [now + 10, [0, 0, 3]],
        [now, [3, 2, null]],
      ],
      3,
    ),
    now + 20,
  );
  assert.deepEqual(historyOf('tracker-1').slice(before), [
    ['tracker-1', 'scenario-run-x', 83, now, ''],
    ['tracker-1', 'scenario-run-x', 33, now + 10, ''],
    ['tracker-1', 'scenario-run-x', '', now + 20, ''],
  ]);
  const reply = post({ action: 'stats', code: 'manager-1' });
  const sam = reply.trackers[0];
  assert.equal(sam.scenarios.x.count, 3);
  assert.deepEqual(sam.scenarios.x.runs[1], {
    at: now + 10,
    ratings: [0, 0, 3],
    struggled: ['cpg-2-1'],
  });
  const runRows = reply.history.filter((row) => row[1] === 'scenario-run-x');
  assert.deepEqual(
    runRows.map((row) => row[2]),
    [83, 33, null],
  );
  assert.equal(JSON.stringify(reply).includes('secret'), false);
  assert.equal(JSON.stringify(tabs.History).includes('secret'), false);
});

test('edits: editors sign in, save, replace and remove edits; anyone can read them', () => {
  tabs.Editors = [
    ['Name', 'Passcode'],
    ['Eve', 'editor-1'],
  ];
  const id = 'cpg-14-3|dose-cardiac-arrest';
  assert.equal(post({ action: 'editor-open', code: 'boss-1' }).error, 'not-found');
  assert.deepEqual(post({ action: 'editor-open', code: 'Editor-1' }), {
    ok: true,
    name: 'Eve',
    edits: {},
    submissions: [],
  });
  const save = (edit, editId = id) =>
    post({ action: 'edit-save', code: 'editor-1', id: editId, edit });
  assert.deepEqual(save({ prompt: 'A', was: {} }).edits, { [id]: { prompt: 'A', was: {} } });
  save({ prompt: 'B', was: {} });
  assert.equal(tabs.Edits.length, 2, 'one row per question');
  assert.equal(tabs.Edits[1][2], 'Eve');
  assert.equal(save({ prompt: 'C' }, 'bad id').error, 'bad-edit');
  assert.equal(save(['not', 'an', 'object']).error, 'bad-edit');
  assert.equal(save({ answer: 'x'.repeat(20001) }).error, 'bad-edit');
  assert.deepEqual(post({ action: 'edits' }).edits, { [id]: { prompt: 'B', was: {} } });
  assert.deepEqual(save(null).edits, {});
  assert.equal(tabs.Edits.length, 1);
});

test('demo: opens the tracker labelled demo in any case, and says not-found when there is none', () => {
  assert.equal(post({ action: 'demo' }).error, 'not-found');
  tabs.Trackers.push(['Demo', 'Demo-Code', 'Mia', 'x']);
  const reply = post({ action: 'demo' });
  assert.equal(reply.ok, true);
  assert.equal(reply.code, 'demo-code');
  assert.equal(reply.label, 'Demo');
});

test('signup: bot checks, the hourly cap, an email for each account, and a new tracker', () => {
  const form = { action: 'signup', name: '  Alex   Smith ', website: '', formMs: 5000 };
  assert.equal(post({ ...form, website: 'spam.example' }).error, 'bad-signup');
  assert.equal(post({ ...form, formMs: 500 }).error, 'too-fast');
  assert.equal(post({ ...form, formMs: undefined }).error, 'too-fast');
  assert.equal(post({ ...form, name: ' 123 ' }).error, 'no-name');
  assert.equal(post({ ...form, name: 'DEMO' }).error, 'no-name');
  assert.equal(emails.length, 0);

  const trackersBefore = tabs.Trackers.length;
  const reply = post(form);
  assert.equal(reply.ok, true);
  assert.equal(reply.label, 'Alex Smith');
  assert.match(reply.code, /^[a-z]+-[a-z]+-[a-z]+-\d+$/);
  const row = tabs.Trackers[trackersBefore];
  assert.deepEqual(row.slice(0, 3), ['Alex Smith', reply.code, 'Signed up in the app']);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, 'owner@example.com');
  assert.match(emails[0].subject, /Alex Smith/);
  assert.equal(post({ action: 'open', code: reply.code }).role, 'tracker');

  Object.keys(cacheValues).forEach((key) => (cacheValues[key] = '20'));
  assert.equal(post(form).error, 'busy');
  assert.equal(emails.length, 1);
});

test('signup: no account is made when the email cannot be sent', () => {
  Object.keys(cacheValues).forEach((key) => delete cacheValues[key]);
  const trackersBefore = tabs.Trackers.length;
  const sendEmail = environment.MailApp.sendEmail;
  environment.MailApp.sendEmail = () => {
    throw new Error('not authorised');
  };
  try {
    const reply = post({ action: 'signup', name: 'Kim', website: '', formMs: 5000 });
    assert.equal(reply.error, 'server-error');
    assert.equal(tabs.Trackers.length, trackersBefore);
  } finally {
    environment.MailApp.sendEmail = sendEmail;
  }
});

test('scenario-submit: no sign-in; bot checks, bad jobs and the hourly cap are refused', () => {
  Object.keys(cacheValues).forEach((key) => delete cacheValues[key]);
  const job = { title: 'Fall', story: 'An 80-year-old fell.', name: 'Ana', patients: [] };
  const photo = { data: Buffer.from('jpeg bytes').toString('base64'), caption: '12-lead' };
  const submit = (body) =>
    post({ action: 'scenario-submit', website: '', formMs: 30000, submission: job, ...body });
  const emailsBefore = emails.length;

  assert.equal(submit({ website: 'spam.example' }).error, 'bad-submission');
  assert.equal(submit({ formMs: 5000 }).error, 'too-fast');
  assert.equal(submit({ submission: { ...job, story: ' ' } }).error, 'bad-submission');
  assert.equal(submit({ submission: [job] }).error, 'bad-submission');
  assert.equal(
    submit({ submission: { ...job, story: 'x'.repeat(30001) } }).error,
    'bad-submission',
  );
  assert.equal(submit({ images: Array(5).fill(photo) }).error, 'bad-submission');
  assert.equal(submit({ images: [{ data: 'not base64!' }] }).error, 'bad-submission');
  assert.equal(tabs.Submissions.length, 1, 'nothing kept for a refused job');

  const reply = submit({ images: [photo, { ...photo, caption: '' }] });
  assert.equal(reply.ok, true);
  const row = tabs.Submissions[1];
  assert.equal(row[0], reply.id);
  assert.deepEqual([row[2], row[3], row[6]], ['Ana', 'Fall', 'Pending']);
  assert.deepEqual(JSON.parse(row[4]), job);
  assert.deepEqual(
    JSON.parse(row[5]).map((each) => each.caption),
    ['12-lead', ''],
  );
  assert.equal(driveFiles.length, 2);
  assert.equal(driveFiles[0].blob.bytes.toString(), 'jpeg bytes');
  assert.equal(emails.length, emailsBefore + 1);
  assert.match(emails.at(-1).subject, /new scenario job, Fall/);
  assert.equal(submit({ submission: { ...job, name: '' }, images: [photo] }).ok, true);
  assert.equal(tabs.Submissions[2][2], 'Anonymous');
  assert.equal(driveFolders.length, 1, 'the folder is made once and then reused');

  Object.keys(cacheValues).forEach((key) => (cacheValues[key] = '30'));
  assert.equal(submit({}).error, 'busy');
  Object.keys(cacheValues).forEach((key) => delete cacheValues[key]);
});

test('submissions: editors see pending jobs and photos, approve or reject; approved are public', () => {
  const [first, second] = tabs.Submissions.slice(1).map((row) => row[0]);
  const editor = (body) => post({ code: 'editor-1', ...body });
  assert.equal(
    post({ action: 'submission-photo', code: 'tracker-1', id: first }).error,
    'not-found',
  );
  const opened = editor({ action: 'editor-open' });
  assert.deepEqual(
    opened.submissions.map((each) => [each.id, each.sender, each.job.title]),
    [
      [first, 'Ana', 'Fall'],
      [second, 'Anonymous', 'Fall'],
    ],
  );
  assert.equal('data' in opened.submissions[0].photos[0], false, 'photos are fetched one by one');
  const shown = editor({ action: 'submission-photo', id: first, index: 0 });
  assert.equal(Buffer.from(shown.data, 'base64').toString(), 'jpeg bytes');
  assert.equal(editor({ action: 'submission-photo', id: first, index: 5 }).error, 'gone');

  assert.equal(editor({ action: 'submission-decide', id: first, decision: 'maybe' }).error, 'gone');
  const approved = editor({ action: 'submission-decide', id: first, decision: 'approve' });
  assert.deepEqual(
    approved.submissions.map((each) => each.id),
    [second],
  );
  assert.deepEqual(tabs.Submissions[1].slice(6, 8), ['Approved', 'Eve']);
  assert.equal(
    editor({ action: 'submission-decide', id: first, decision: 'reject' }).error,
    'gone',
  );
  editor({ action: 'submission-decide', id: second, decision: 'reject' });
  assert.equal(tabs.Submissions[2][6], 'Rejected');

  const published = post({ action: 'approved-scenarios' }).submissions;
  assert.deepEqual(
    published.map((each) => each.id),
    [first],
  );
  assert.equal(Buffer.from(published[0].photos[0].data, 'base64').toString(), 'jpeg bytes');
  assert.equal(driveFiles[0].trashed, undefined);
  assert.equal(driveFiles[1].trashed, undefined);
  assert.equal(driveFiles[2].trashed, true, 'a rejected job’s photos are deleted');
});
