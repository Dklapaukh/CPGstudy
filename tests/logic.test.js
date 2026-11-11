// Tests for the pure functions in src/logic.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  getStatus,
  countStatuses,
  guidelineMatches,
  mergeRemoteEntries,
  nextTimestamp,
  syncStatusText,
  flattenGuidelines,
  ringArcs,
} from '../src/logic.js';

const sampleGuidelines = [
  { id: 'a', n: '1.1', t: 'Alpha', sec: 'First', b: [['p', 'Give adrenaline', 0]] },
  { id: 'b', n: '1.2', t: 'Beta', sec: 'First', b: [['p', 'Give oxygen', 0]] },
  { id: 'c', n: '2.1', t: 'Gamma', sec: 'Second', b: [] },
];

test('escapeHtml escapes the four risky characters', () => {
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('getStatus defaults to incomplete', () => {
  assert.equal(getStatus({}, 'a'), 'i');
  assert.equal(getStatus({ a: { s: 'c', n: '', t: 1 } }, 'a'), 'c');
});

test('countStatuses counts every guideline once', () => {
  const entries = { a: { s: 'c' }, b: { s: 'v' } };
  assert.deepEqual(countStatuses(sampleGuidelines, entries), { i: 1, v: 1, c: 1 });
});

test('guidelineMatches applies status filter, title search and body search', () => {
  const [alpha] = sampleGuidelines;
  assert.equal(guidelineMatches(alpha, 'i', 'done', ''), false);
  assert.equal(guidelineMatches(alpha, 'c', 'done', ''), true);
  assert.equal(guidelineMatches(alpha, 'i', 'rev', ''), false);
  assert.equal(guidelineMatches(alpha, 'i', 'all', 'alph'), true);
  assert.equal(guidelineMatches(alpha, 'i', 'all', 'first'), true);
  assert.equal(guidelineMatches(alpha, 'i', 'all', 'adrenaline'), true);
  assert.equal(guidelineMatches(alpha, 'i', 'all', 'oxygen'), false);
});

test('mergeRemoteEntries: newest time wins and ties keep the local entry', () => {
  const local = { a: { s: 'c', n: 'mine', t: 10 } };
  const older = mergeRemoteEntries(local, { a: { s: 'i', n: 'theirs', t: 5 } });
  assert.deepEqual(older.entries.a, local.a);
  assert.equal(older.changed, false);
  const tie = mergeRemoteEntries(local, { a: { s: 'i', n: 'theirs', t: 10 } });
  assert.deepEqual(tie.entries.a, local.a);
  const newer = mergeRemoteEntries(local, { a: { s: 'v', n: 'theirs', t: 11 } });
  assert.deepEqual(newer.entries.a, { s: 'v', n: 'theirs', t: 11 });
  assert.equal(newer.changed, true);
});

test('mergeRemoteEntries: new entries are added with defaults and do not change the input', () => {
  const local = {};
  const merged = mergeRemoteEntries(local, { z: { t: 3 } });
  assert.deepEqual(merged.entries.z, { s: 'i', n: '', t: 3 });
  assert.equal(merged.changed, true);
  assert.deepEqual(local, {});
});

test('mergeRemoteEntries: a newer time with the same content is not a visible change', () => {
  const local = { a: { s: 'c', n: 'x', t: 1 } };
  const merged = mergeRemoteEntries(local, { a: { s: 'c', n: 'x', t: 2 } });
  assert.equal(merged.changed, false);
  assert.equal(merged.entries.a.t, 2);
});

test('nextTimestamp always moves forward', () => {
  assert.equal(nextTimestamp(0, 100), 100);
  assert.equal(nextTimestamp(100, 100), 101);
  assert.equal(nextTimestamp(150, 100), 151);
});

test('syncStatusText', () => {
  const base = { lastSyncFailed: false, isOnline: true, pendingCount: 0 };
  assert.equal(syncStatusText(base), 'Saved');
  assert.equal(syncStatusText({ ...base, pendingCount: 2 }), 'Saving…');
  assert.equal(syncStatusText({ ...base, isOnline: false }), 'Waiting for signal');
  assert.equal(syncStatusText({ ...base, lastSyncFailed: true }), 'Waiting for signal');
});

test('flattenGuidelines adds the section name', () => {
  const flat = flattenGuidelines({ sections: [{ name: 'S', items: [{ id: 'x' }] }] });
  assert.deepEqual(flat, [{ id: 'x', sec: 'S' }]);
});

test('ringArcs sizes the green and orange arcs and detects a closed ring', () => {
  const counts = { i: 5, v: 2, c: 3 };
  assert.deepEqual(ringArcs(counts, 10), {
    completePercent: 30,
    reviewPercent: 20,
    isClosed: false,
  });
  assert.equal(ringArcs({ i: 0, v: 0, c: 4 }, 4).isClosed, true);
  assert.equal(ringArcs({ i: 4, v: 0, c: 0 }, 4).completePercent, 0);
  assert.deepEqual(ringArcs({ i: 0, v: 0, c: 0 }, 0), {
    completePercent: 0,
    reviewPercent: 0,
    isClosed: false,
  });
});
