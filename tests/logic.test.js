// Tests for the pure functions in src/logic.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  getStatus,
  countStatuses,
  guidelineMatches,
  guidelineSearchText,
  mergeRemoteEntries,
  nextTimestamp,
  syncStatusText,
  flattenGuidelines,
  ringArcs,
  suggestionCandidates,
  pickSuggestion,
  markedTime,
  feedbackMailto,
} from '../src/logic.js';

const sampleGuidelines = [
  {
    id: 'a',
    n: '1.1',
    t: 'Alpha',
    sec: 'First',
    b: [['p', 'Give adrenaline', 0]],
  },
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
  assert.deepEqual(countStatuses(sampleGuidelines, entries), {
    i: 1,
    v: 1,
    c: 1,
  });
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
  assert.equal(guidelineMatches(alpha, 'i', 'all', '  Give  ADRENALINE '), true);
});

test('guidelineSearchText holds the words of every block and none of the markup (R8)', () => {
  const guideline = {
    b: [
      ['h', 'Dose', '#00693C'],
      ['b', 'Give <b>adrenaline</b> if SpO2 &lt; 94%', 1, '#00693C'],
      ['k', 'I', 'Identify<br>yourself', '#00693C'],
      ['box', [['p', 'Boxed &amp; safe', 0]], '#00693C'],
      ['tbl', [[{ t: 'Cell one', bg: null, w: false }, null]]],
    ],
  };
  assert.equal(
    guidelineSearchText(guideline),
    'dose give adrenaline if spo2 < 94% i identify yourself boxed & safe cell one',
  );
});

test('mergeRemoteEntries: newest time wins and ties keep the local entry', () => {
  const local = { a: { s: 'c', n: 'mine', t: 10 } };
  const older = mergeRemoteEntries(local, { a: { s: 'i', n: 'theirs', t: 5 } });
  assert.deepEqual(older.entries.a, local.a);
  assert.equal(older.changed, false);
  const tie = mergeRemoteEntries(local, { a: { s: 'i', n: 'theirs', t: 10 } });
  assert.deepEqual(tie.entries.a, local.a);
  const newer = mergeRemoteEntries(local, {
    a: { s: 'v', n: 'theirs', t: 11 },
  });
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
  const flat = flattenGuidelines({
    sections: [{ name: 'S', items: [{ id: 'x' }] }],
  });
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

const sampleSections = [
  { name: 'First', items: [sampleGuidelines[0], sampleGuidelines[1]] },
  { name: 'Second', items: [sampleGuidelines[2]] },
];

test('suggestionCandidates uses the one open section, otherwise everything', () => {
  assert.deepEqual(
    suggestionCandidates(sampleSections, ['Second']).map((g) => g.id),
    ['c'],
  );
  assert.equal(suggestionCandidates(sampleSections, []).length, 3);
  assert.equal(suggestionCandidates(sampleSections, ['First', 'Second']).length, 3);
});

test('pickSuggestion favours Incomplete, then Needs review, then Complete', () => {
  // a is Complete (weight 1), b is Review (3), c is Incomplete (6).
  const entries = { a: { s: 'c' }, b: { s: 'v' } };
  const pick = (randomNumber) => pickSuggestion(sampleGuidelines, entries, randomNumber).id;
  assert.equal(pick(0), 'a'); // weights run a: 0-0.1, b: 0.1-0.4, c: 0.4-1
  assert.equal(pick(0.09), 'a');
  assert.equal(pick(0.1), 'b');
  assert.equal(pick(0.39), 'b');
  assert.equal(pick(0.4), 'c');
  assert.equal(pick(0.9999), 'c');
});

test('pickSuggestion returns undefined for an empty list', () => {
  assert.equal(pickSuggestion([], {}, 0.5), undefined);
});

test('markedTime: the marked entry, else the last edit for older data, 0 when Incomplete', () => {
  const entries = {
    a: { s: 'c', n: 'notes edited later', t: 900 },
    'marked-a': { s: 'i', n: '500', t: 500 },
    b: { s: 'v', n: '', t: 700 },
    c: { s: 'i', n: 'only notes', t: 800 },
  };
  assert.equal(markedTime(entries, 'a'), 500, 'editing notes later does not move the date');
  assert.equal(markedTime(entries, 'b'), 700, 'marked before the marked entry existed');
  assert.equal(markedTime(entries, 'c'), 0);
  assert.equal(markedTime(entries, 'never-opened'), 0);
});

test('feedbackMailto fills in subject and body, and is empty without an address', () => {
  assert.equal(feedbackMailto('', 'Hi', 'Body'), '');
  assert.equal(
    feedbackMailto('me@example.com', 'CPG 1.2 & more', 'Line 1\nLine 2'),
    'mailto:me@example.com?subject=CPG%201.2%20%26%20more&body=Line%201%0ALine%202',
  );
});
