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

test('two points that start the same way share a highlight (known limit, Decision K1)', () => {
  const start = 'y'.repeat(70);
  const notes = appendComment('', makeSnippet(`${start} first`), 'ok');
  assert.equal(notesHaveComment(notes, `${start} second`), true);
});
