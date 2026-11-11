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

function fakeSheet(name) {
  return {
    getDataRange: () => ({ getValues: () => tabs[name] }),
    getLastRow: () => tabs[name].length,
    appendRow: (row) => tabs[name].push(row),
    getRange: (a, b) => {
      if (a === 'A:A') {
        return {
          createTextFinder: (key) => ({
            matchEntireCell: () => ({
              findNext: () => {
                const i = tabs.Data.findIndex((row, index) => index > 0 && row[0] === key);
                return i < 0 ? null : { getRow: () => i + 1 };
              },
            }),
          }),
        };
      }
      return {
        getValue: () => tabs.Data[a - 1][b - 1],
        setValues: (values) => values[0].forEach((v, j) => (tabs.Data[a - 1][b - 1 + j] = v)),
      };
    },
  };
}

const environment = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: fakeSheet }) },
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
const { doPost } = new Function(...Object.keys(environment), `${source}; return { doPost };`)(
  ...Object.values(environment),
);
const post = (body) => JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } }).text);

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
