/*
 * Comment button logic (review item R4, option 2).
 * A comment is a line added to the notes, starting with a snippet of the point: its first 70
 * characters, or more when another point of the guideline starts the same way, so that each
 * point has its own snippet. The highlight on a point is found again by matching that line, so
 * the format must not change.
 * Pure functions only; tests in tests/comments.test.js.
 */
import { COMMENT_SNIPPET_LENGTH } from './constants.js';

/** Text of a point with every run of white space made one space. */
function normalise(pointText) {
  return (pointText || '').replace(/\s+/g, ' ').trim();
}

/** Number of characters two texts have in common at their start. */
function commonStartLength(first, second) {
  const limit = Math.min(first.length, second.length);
  let length = 0;
  while (length < limit && first[length] === second[length]) length++;
  return length;
}

/**
 * Length of the snippet that tells a point apart from the other points of its guideline: the
 * usual length, or one character past the longest start it shares with a different point.
 * Points with exactly the same text cannot be told apart and share a snippet.
 */
function snippetLength(text, otherPointTexts) {
  let length = COMMENT_SNIPPET_LENGTH;
  for (const otherText of otherPointTexts) {
    const other = normalise(otherText);
    if (other !== text) length = Math.max(length, commonStartLength(text, other) + 1);
  }
  return length;
}

/**
 * Shortens the text of a point to the snippet used at the start of a comment line. Takes the
 * point's text and the texts of all points of the guideline (the point itself may be included).
 */
export function makeSnippet(pointText, otherPointTexts = []) {
  const text = normalise(pointText);
  const length = snippetLength(text, otherPointTexts);
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function commentPrefix(snippet) {
  return `• ${snippet} — `;
}

/** Returns the notes with a new comment line added at the end. */
export function appendComment(notes, snippet, comment) {
  const existing = notes ? `${notes.replace(/\s+$/, '')}\n` : '';
  return `${existing}${commentPrefix(snippet)}${comment}`;
}

/**
 * True when the notes hold a comment on this point. Comments written before snippets were made
 * unique used the first 70 characters only, so that older form still counts (and is still shared
 * by points that start the same way).
 */
export function notesHaveComment(notes, pointText, otherPointTexts = []) {
  if (!notes) return false;
  const snippets = [makeSnippet(pointText, otherPointTexts), makeSnippet(pointText)];
  return snippets.some((snippet) => snippet && notes.includes(commentPrefix(snippet)));
}
