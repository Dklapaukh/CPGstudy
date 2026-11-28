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
let locks = 0; // how many times a request waited for the script lock
const emails = [];
const cacheValues = {};
const properties = {};
const driveFolders = []; // { id, name, parent, trashed }
const driveFiles = []; // { id, folder, name, blob or content, description, trashed }
const docs = {}; // Google Docs by id: { name, paragraphs: [{ text, heading }] }

/** A stand-in for a Drive file, as DriveApp.getFileById and a folder's files give it. */
function fakeFile(file) {
  return {
    getId: () => file.id,
    setDescription: (text) => (file.description = text),
    setContent: (text) => (file.content = text),
    setTrashed: (trashed) => (file.trashed = trashed),
    moveTo: (folder) => (file.folder = folder.getId()),
    getBlob: () => ({
      getBytes: () => file.blob.bytes,
      getDataAsString: () => file.content,
    }),
  };
}

/** A stand-in for a Drive folder: files and folders made in it are kept above. */
function fakeFolder(id) {
  return {
    getId: () => id,
    createFolder: (name) => {
      const folder = { id: `folder-${driveFolders.length + 1}`, name, parent: id };
      driveFolders.push(folder);
      return fakeFolder(folder.id);
    },
    // A photo is made from a blob; a data file from its name, text and type.
    createFile: (blobOrName, content) => {
      const file = { id: `file-${driveFiles.length + 1}`, folder: id };
      if (typeof blobOrName === 'string') Object.assign(file, { name: blobOrName, content });
      else file.blob = blobOrName;
      driveFiles.push(file);
      return fakeFile(file);
    },
    getFilesByName: (name) => {
      const found = driveFiles.filter((file) => file.folder === id && file.name === name);
      return { hasNext: () => found.length > 0, next: () => fakeFile(found.shift()) };
    },
    setTrashed: (trashed) => (driveFolders.find((folder) => folder.id === id).trashed = trashed),
  };
}

/** A stand-in for a Google Doc: its paragraphs, each with a heading kind or none. */
function fakeDoc(id) {
  const doc = docs[id];
  return {
    getId: () => id,
    getBody: () => ({
      clear: () => (doc.paragraphs = []),
      appendParagraph: (text) => {
        const paragraph = { text, heading: '' };
        doc.paragraphs.push(paragraph);
        return { setHeading: (heading) => (paragraph.heading = heading) };
      },
    }),
    saveAndClose() {},
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
  LockService: { getScriptLock: () => ({ waitLock: () => locks++, releaseLock() {} }) },
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
    createFolder: (name) => {
      driveFolders.push({ id: `folder-${driveFolders.length + 1}`, name, parent: 'root' });
      return fakeFolder(driveFolders.at(-1).id);
    },
    getFolderById: (id) => fakeFolder(id),
    getFileById: (id) => fakeFile(driveFiles.find((each) => each.id === id)),
  },
  DocumentApp: {
    create: (name) => {
      const id = `doc-${Object.keys(docs).length + 1}`;
      docs[id] = { name, paragraphs: [] };
      driveFiles.push({ id, folder: 'root', name });
      return fakeDoc(id);
    },
    openById: (id) => fakeDoc(id),
    ParagraphHeading: { TITLE: 'TITLE', HEADING1: 'HEADING1', HEADING2: 'HEADING2' },
  },
  CacheService: {
    getScriptCache: () => ({
      get: (key) => cacheValues[key] ?? null,
      put: (key, value) => (cacheValues[key] = value),
      remove: (key) => delete cacheValues[key],
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
  assert.match(
    doGet().text,
    /running, version with since and read-only requests unlocked \(28 Nov 2026\)/,
  );
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

test('save: many changes in one read; a repeated id keeps the newest; rows stay one per key', () => {
  const t = Date.now() - 1000;
  const saved = post({
    action: 'save',
    code: 'tracker-1',
    changes: [
      { id: 'b1', s: 'c', n: 'one', t },
      { id: 'b2', s: 'v', n: 'two', t },
      { id: 'b1', s: 'v', n: 'newer', t: t + 1 },
      { id: 'b2', s: 'c', n: 'older', t: t - 1 },
    ],
  });
  assert.equal(saved.saved, 3);
  assert.deepEqual(saved.data.b1, { s: 'v', n: 'newer', t: t + 1 });
  assert.equal(saved.data.b2.n, 'two');
  const again = post({
    action: 'save',
    code: 'tracker-1',
    changes: [
      { id: 'b2', s: 'c', n: 'two again', t: t + 5 },
      { id: 'b1', s: 'c', n: 'one again', t: t + 5 },
    ],
  });
  assert.equal(again.saved, 2);
  const keys = tabs.Data.map((row) => row[0]).filter((key) => /\|b[12]$/.test(key));
  assert.deepEqual(keys.sort(), ['tracker-1|b1', 'tracker-1|b2']);
  assert.equal(post({ action: 'load', code: 'tracker-1' }).data.b1.n, 'one again');
});

test('since: load and save send back only entries edited after it', () => {
  // g1 from an earlier test is dated ahead of the clock, so only these ids are compared.
  const ids = (data) => Object.keys(data).filter((id) => /^[bs]\d$/.test(id));
  const t = Date.now() - 500;
  post({ action: 'save', code: 'tracker-1', changes: [{ id: 's1', s: 'c', n: 'a', t }] });
  assert.deepEqual(ids(post({ action: 'load', code: 'tracker-1', since: t - 1 }).data), ['s1']);
  assert.deepEqual(ids(post({ action: 'load', code: 'tracker-1', since: t }).data), []);
  const save = post({
    action: 'save',
    code: 'tracker-1',
    since: t,
    changes: [{ id: 's2', s: 'v', n: 'b', t: t + 1 }],
  });
  assert.deepEqual(ids(save.data), ['s2']);
  assert.deepEqual(ids(post({ action: 'load', code: 'tracker-1' }).data).sort(), [
    'b1',
    'b2',
    's1',
    's2',
  ]);
});

test('lock: only writes wait for it; reads such as load, open and edits do not', () => {
  const before = locks;
  post({ action: 'load', code: 'tracker-1' });
  post({ action: 'open', code: 'tracker-1' });
  post({ action: 'edits' });
  post({ action: 'editor-open', code: 'nobody' });
  assert.equal(locks, before);
  post({ action: 'save', code: 'tracker-1', changes: [] });
  post({ action: 'signup', name: '' });
  post({ action: 'edit-save', code: 'nobody' });
  assert.equal(locks, before + 3);
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
      runs: runs.map(([at, ratings, rated]) => ({
        at,
        rated,
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
        [now + 20, [], 'competencies'],
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
    rated: 'outcomes',
    ratings: [0, 0, 3],
    struggled: ['cpg-2-1'],
  });
  assert.equal(
    sam.scenarios.x.runs[0].rated,
    'competencies',
    'the manager page can tell them apart',
  );
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
  const patient = {
    label: '',
    history: 'Hypertension',
    vitalSets: [{ note: 'On arrival', vitals: { gcs: '14', hr: '48', bp: '88/54', rr: '' } }],
    assessment: 'Inferior STEMI',
    followUp: 'Stented',
  };
  const job = {
    title: 'Fall',
    dispatch: '80F fall',
    story: 'An 80-year-old fell.',
    name: 'Ana',
    guidelines: ['cpg-3-2'],
    intention: 'Look for the cause of a fall',
    patients: [patient],
  };
  const photo = { data: Buffer.from('jpeg bytes').toString('base64'), caption: '12-lead' };
  const submit = (body) =>
    post({ action: 'scenario-submit', website: '', formMs: 30000, submission: job, ...body });
  const emailsBefore = emails.length;

  assert.equal(submit({ website: 'spam.example' }).error, 'bad-submission');
  assert.equal(submit({ formMs: 5000 }).error, 'too-fast');
  assert.equal(submit({ submission: { ...job, story: ' ' } }).error, 'bad-submission');
  assert.equal(submit({ submission: [job] }).error, 'bad-submission');
  assert.equal(
    submit({ submission: { ...job, story: 'x'.repeat(150001) } }).error,
    'bad-submission',
  );
  assert.equal(submit({ images: Array(5).fill(photo) }).error, 'bad-submission');
  assert.equal(submit({ images: [{ data: 'not base64!' }] }).error, 'bad-submission');
  assert.equal(tabs.Submissions.length, 1, 'nothing kept for a refused job');
  assert.equal(driveFolders.length, 0, 'no folder for a refused job');

  // A long job, past what one Sheet cell holds, is kept whole in Drive.
  const long = { ...job, patients: [{ ...patient, assessment: 'x'.repeat(60000) }] };
  const reply = submit({ submission: long, images: [photo, { ...photo, caption: '' }] });
  assert.equal(reply.ok, true);
  const row = tabs.Submissions[1];
  assert.equal(row[0], reply.id);
  assert.deepEqual([row[2], row[3], row[6]], ['Ana', 'Fall', 'Pending']);
  const pointer = JSON.parse(row[4]);
  assert.ok(row[4].length < 200, 'the cell keeps only a pointer');

  const [root, jobFolder] = driveFolders;
  assert.equal(root.name, 'CPG scenario submissions');
  assert.equal(jobFolder.parent, root.id, 'each job has its own subfolder');
  assert.match(jobFolder.name, new RegExp(`^\\d{4}-\\d{2}-\\d{2} Fall \\(${reply.id}\\)$`));
  assert.equal(pointer.folder, jobFolder.id);
  const inFolder = driveFiles.filter((file) => file.folder === jobFolder.id);
  assert.deepEqual(
    inFolder.map((file) => file.name || file.blob.name),
    [`${reply.id}-1.jpg`, `${reply.id}-2.jpg`, 'job.json', 'Job: Fall'],
    'photos, data and Doc together',
  );
  assert.deepEqual(JSON.parse(inFolder[2].content), long);
  assert.equal(driveFiles[0].blob.bytes.toString(), 'jpeg bytes');
  assert.deepEqual(
    JSON.parse(row[5]).map((each) => each.caption),
    ['12-lead', ''],
  );

  const doc = docs[pointer.doc].paragraphs;
  const text = doc.map((paragraph) => paragraph.text);
  assert.deepEqual(doc[0], { text: 'Fall', heading: 'TITLE' });
  for (const [label, value] of [
    ['Dispatch notes', '80F fall'],
    ['History', 'An 80-year-old fell.'],
    ['Medical history', 'Hypertension'],
    ['Vitals 1: On arrival', 'GCS 14, HR 48, BP 88/54'],
    ['Follow up', 'Stented'],
    ['Guidelines used', '3.2'],
    ['Learning points', 'Look for the cause of a fall'],
  ]) {
    assert.equal(text[text.indexOf(label) + 1], value, label);
  }
  assert.equal(text[text.indexOf('Assessment') + 1].length, 60000);

  assert.equal(emails.length, emailsBefore + 1);
  assert.match(emails.at(-1).subject, /new scenario job, Fall/);
  assert.equal(submit({ submission: { ...job, name: '' }, images: [photo] }).ok, true);
  assert.equal(tabs.Submissions[2][2], 'Anonymous');
  assert.equal(
    driveFolders.filter((folder) => folder.parent === 'root').length,
    1,
    'the main folder is made once and then reused',
  );

  // A Doc that can't be made (Docs not yet allowed) doesn't stop the job being kept.
  const create = environment.DocumentApp.create;
  environment.DocumentApp.create = () => {
    throw new Error('not authorised');
  };
  try {
    const kept = submit({ submission: { ...job, title: 'No doc' } });
    assert.equal(kept.ok, true);
    assert.equal(JSON.parse(tabs.Submissions.at(-1)[4]).doc, '');
  } finally {
    environment.DocumentApp.create = create;
  }

  Object.keys(cacheValues).forEach((key) => (cacheValues[key] = '30'));
  assert.equal(submit({}).error, 'busy');
  Object.keys(cacheValues).forEach((key) => delete cacheValues[key]);
});

test('submissions: editors see pending jobs and photos, approve or reject; approved are public', () => {
  const [first, second, third] = tabs.Submissions.slice(1).map((row) => row[0]);
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
      [third, 'Ana', 'No doc'],
    ],
  );
  assert.equal(opened.submissions[0].job.patients[0].assessment.length, 60000, 'read from Drive');
  assert.equal('data' in opened.submissions[0].photos[0], false, 'photos are fetched one by one');
  const shown = editor({ action: 'submission-photo', id: first, index: 0 });
  assert.equal(Buffer.from(shown.data, 'base64').toString(), 'jpeg bytes');
  assert.equal(editor({ action: 'submission-photo', id: first, index: 5 }).error, 'gone');

  assert.equal(editor({ action: 'submission-decide', id: first, decision: 'maybe' }).error, 'gone');
  const approved = editor({ action: 'submission-decide', id: first, decision: 'approve' });
  assert.deepEqual(
    approved.submissions.map((each) => each.id),
    [second, third],
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
  const folderOf = (id) => JSON.parse(tabs.Submissions.find((row) => row[0] === id)[4]).folder;
  const trashed = (id) => driveFolders.find((folder) => folder.id === folderOf(id)).trashed;
  assert.equal(trashed(first), undefined);
  assert.equal(trashed(second), true, 'a rejected job’s folder (photos, data, Doc) is deleted');
});

test('approved jobs: kept in their Drive folder, the Edits row only points there', () => {
  const [first] = tabs.Submissions.slice(1).map((row) => row[0]);
  const editor = (body) => post({ code: 'editor-1', ...body });
  const sent = JSON.parse(tabs.Submissions[1][4]);
  const scenario = {
    id: first,
    title: 'Fall at home',
    suburb: 'Porirua',
    story: 'Dispatch: 80F fall\n\nAn 80-year-old fell.',
    intention: 'Look for the cause',
    guidelines: ['cpg-3-2'],
    patients: [
      {
        history: 'Hypertension',
        vitals: { gcs: '14', hr: '48', bp: '88/54' },
        laterVitals: [{ note: 'After fluids', vitals: { hr: '64' } }],
        assessment: 'y'.repeat(30000),
      },
    ],
  };
  const edit = {
    kind: 'anonymised-job',
    approved: '2026-11-27',
    lessons: ['Look for the cause'],
    job: scenario,
  };
  assert.equal(editor({ action: 'edit-save', id: `job|${first}`, edit }).ok, true);
  const row = tabs.Edits.find((cells) => cells[0] === `job|${first}`);
  const kept = JSON.parse(row[1]);
  assert.deepEqual(Object.keys(kept.job).sort(), ['doc', 'drive', 'folder']);
  assert.equal(kept.job.folder, sent.folder, 'the folder it was sent with');
  assert.equal(kept.job.doc, sent.doc, 'the same Doc, rewritten');
  assert.deepEqual(kept.lessons, ['Look for the cause']);
  const approvedFile = driveFiles.find((file) => file.id === kept.job.drive);
  assert.equal(approvedFile.name, 'approved.json');
  assert.equal(approvedFile.folder, sent.folder);
  const text = docs[sent.doc].paragraphs.map((paragraph) => paragraph.text);
  assert.equal(text[0], 'Fall at home');
  assert.equal(text[text.indexOf('Dispatch notes and history') + 1], scenario.story);
  assert.equal(text[text.indexOf('Vitals 2: After fluids') + 1], 'HR 64');
  assert.equal(text[text.indexOf('Lessons learnt') + 1], 'Look for the cause');

  // The editor page and the daily copy get the whole job back.
  const read = editor({ action: 'editor-open' }).edits[`job|${first}`];
  assert.deepEqual(read.job, scenario);

  // A later change rewrites approved.json in place (not a new file or folder).
  const files = driveFiles.length;
  const folders = driveFolders.length;
  const changed = { ...edit, lessons: ['New lesson'], job: { ...scenario, title: 'Changed' } };
  assert.equal(editor({ action: 'edit-save', id: `job|${first}`, edit: changed }).ok, true);
  assert.equal(driveFiles.length, files);
  assert.equal(driveFolders.length, folders);
  assert.equal(editor({ action: 'editor-open' }).edits[`job|${first}`].job.title, 'Changed');
  assert.equal(docs[sent.doc].paragraphs[0].text, 'Changed');

  // Other edits keep the old cell limit; a job edit may be longer.
  const big = { kind: 'scenario', note: 'x'.repeat(20001) };
  assert.equal(
    editor({ action: 'edit-save', id: 'scenario|long-lie', edit: big }).error,
    'bad-edit',
  );
  const tooBig = { ...edit, job: { ...scenario, story: 'x'.repeat(150001) } };
  assert.equal(editor({ action: 'edit-save', id: `job|${first}`, edit: tooBig }).error, 'bad-edit');
});

test('approved jobs: one sent before job folders gets a folder when first saved', () => {
  const id = 'job-old1-abcd';
  const old = { title: 'Old job', story: 'Kept in the cell.', patients: [] };
  tabs.Submissions.push([id, 'x', 'Ana', 'Old job', JSON.stringify(old), '[]', 'Pending', '', '']);
  const editor = (body) => post({ code: 'editor-1', ...body });
  const opened = editor({ action: 'editor-open' });
  assert.deepEqual(opened.submissions.find((each) => each.id === id).job, old);
  const edit = { kind: 'anonymised-job', approved: '2026-11-27', lessons: [], job: { ...old, id } };
  assert.equal(editor({ action: 'edit-save', id: `job|${id}`, edit }).ok, true);
  const kept = JSON.parse(tabs.Edits.find((cells) => cells[0] === `job|${id}`)[1]);
  const folder = driveFolders.find((each) => each.id === kept.job.folder);
  assert.match(folder.name, /Old job \(job-old1-abcd\)$/);
  assert.equal(editor({ action: 'editor-open' }).edits[`job|${id}`].job.story, 'Kept in the cell.');
  editor({ action: 'edit-save', id: `job|${id}`, edit });
  assert.equal(
    driveFolders.filter((each) => each.name.endsWith('(job-old1-abcd)')).length,
    1,
    'saving again reuses it',
  );
});
