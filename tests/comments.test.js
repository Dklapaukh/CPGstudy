// Tests for the comment button logic (src/comments.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSnippet, appendComment, notesHaveComment } from '../src/comments.js';

test('makeSnippet collapses spaces and cuts at 70 characters', () => {
  assert.equal(makeSnippet('  Give   oxygen \n now '), 'Give oxygen now');
  assert.equal(makeSnippet('x'.repeat(70)), 'x'.repeat(70));
  assert.equal(makeSnippet('x'.repeat(71)), `${'x'.repeat(70)}…`);
  assert.equal(makeSnippet(undefined), '');
});

test('appendComment starts a line, or continues after existing notes', () => {
  assert.equal(appendComment('', 'Point', 'Check'), '• Point — Check');
  assert.equal(appendComment('Notes  \n', 'Point', 'Check'), 'Notes\n• Point — Check');
});

test('notesHaveComment finds a comment on the same point only', () => {
  const notes = appendComment('', makeSnippet('Give oxygen'), 'ok');
  assert.equal(notesHaveComment(notes, 'Give   oxygen'), true);
  assert.equal(notesHaveComment(notes, 'Give adrenaline'), false);
  assert.equal(notesHaveComment('', 'Give oxygen'), false);
  assert.equal(notesHaveComment(notes, ''), false);
});

test('points that start the same way get longer snippets and separate highlights (R4)', () => {
  const start = 'y'.repeat(70);
  const points = [`${start} first`, `${start} second`, 'Give oxygen'];
  assert.equal(makeSnippet(points[0], points), `${start} f…`);
  assert.equal(makeSnippet(points[2], points), 'Give oxygen');
  const notes = appendComment('', makeSnippet(points[0], points), 'ok');
  assert.equal(notesHaveComment(notes, points[0], points), true);
  assert.equal(notesHaveComment(notes, points[1], points), false);
});

test('a point that is the start of a longer point keeps its own snippet', () => {
  const short = 'z'.repeat(80);
  const points = [short, `${short} and more`];
  assert.equal(makeSnippet(points[0], points), short);
  const notes = appendComment('', makeSnippet(points[1], points), 'ok');
  assert.equal(notesHaveComment(notes, points[0], points), false);
});

test('a comment written with the older 70-character snippet still highlights', () => {
  const start = 'y'.repeat(70);
  const points = [`${start} first`, `${start} second`];
  const olderNotes = appendComment('', makeSnippet(points[0]), 'ok');
  assert.equal(notesHaveComment(olderNotes, points[0], points), true);
  assert.equal(notesHaveComment(olderNotes, points[1], points), true);
});
