// Tests for the study streak (src/streakState.js): reading the saved days, the current and
// longest streak, the rank and the activity grid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStreakDays,
  currentStreak,
  longestStreak,
  ratRank,
  activityWeeks,
  isDemoLabel,
} from '../src/streakState.js';

test('parseStreakDays sorts, removes repeats and survives bad notes', () => {
  assert.deepEqual(parseStreakDays('{"days":[5,3,5,"x",4.5]}'), [3, 5]);
  assert.deepEqual(parseStreakDays('not json'), []);
  assert.deepEqual(parseStreakDays(''), []);
});

test('the streak is active only once a quiz is done today, and survives until tomorrow', () => {
  assert.deepEqual(currentStreak([8, 9, 10], 10), { count: 3, isActive: true });
  assert.deepEqual(currentStreak([8, 9], 10), { count: 2, isActive: false }, 'can be kept today');
  assert.deepEqual(
    currentStreak([7, 8], 10),
    { count: 0, isActive: false },
    'a missed day ends it',
  );
});

test('longestStreak finds the longest run of days in a row', () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak([1, 2, 3, 7, 8, 20]), 3);
});

test('ratRank names the rank and how far the next one is', () => {
  assert.deepEqual(ratRank(0), { name: 'Lab rat', next: 'Maze runner', toNext: 3 });
  assert.deepEqual(ratRank(12), { name: 'Street rat', next: 'Sewer sergeant', toNext: 13 });
  assert.equal(ratRank(500).next, '');
});

test('activityWeeks ends on today, oldest week first', () => {
  const weeks = activityWeeks([100, 86], 100, 2);
  assert.equal(weeks.length, 2);
  assert.deepEqual(weeks[1][6], { day: 100, done: true });
  assert.deepEqual(weeks[0][0], { day: 87, done: false });
});

test('isDemoLabel matches the demo label in any case and ignores spaces', () => {
  assert.equal(isDemoLabel(' DEMO '), true);
  assert.equal(isDemoLabel('Demo - 2026'), false);
  assert.equal(isDemoLabel(''), false);
});
