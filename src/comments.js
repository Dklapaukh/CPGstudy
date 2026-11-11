/*
 * Comment button logic (Decision K, option 1: kept as it was, in one clearly labelled place).
 * A comment is a line added to the notes, starting with the first 70 characters of the point.
 * The highlight on a point is found again by matching that line, so the format must not change.
 * Pure functions only; tests in tests/comments.test.js.
 */
import { COMMENT_SNIPPET_LENGTH } from './constants.js';

/** Shortens the text of a point to the snippet used at the start of a comment line. */
export function makeSnippet(pointText) {
  const text = (pointText || '').replace(/\s+/g, ' ').trim();
  return text.length > COMMENT_SNIPPET_LENGTH ? `${text.slice(0, COMMENT_SNIPPET_LENGTH)}…` : text;
}

function commentPrefix(snippet) {
  return `• ${snippet} — `;
}

/** Returns the notes with a new comment line added at the end. */
export function appendComment(notes, snippet, comment) {
  const existing = notes ? `${notes.replace(/\s+$/, '')}\n` : '';
  return `${existing}${commentPrefix(snippet)}${comment}`;
}

/** True when the notes already hold a comment on this point. */
export function notesHaveComment(notes, pointText) {
  const snippet = makeSnippet(pointText);
  return Boolean(notes && snippet && notes.includes(commentPrefix(snippet)));
}
