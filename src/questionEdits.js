/*
 * Editors' changes to quiz questions (the editor page, editor.html), pure logic. Questions are
 * still built from the guidelines; an edit replaces some fields of one built question. Each
 * edit keeps a copy of what the question said when it was edited (`was`), so a guideline update
 * that changes or removes the question is found and shown to an editor. Until an editor deals
 * with it, the edit stays live.
 *
 * An edit is { ...fields, kind, off?, was }: the replaced fields (names in EDIT_FIELDS), the
 * question's kind, `off: true` to leave the question out, and `was`, the reviewed fields of the
 * question when it was edited (see snapshot).
 * Published edits are in content/card-edits.js; the Sheet's Edits tab holds the latest ones.
 * Depends on constants.js and quizDoses.js.
 */
import { BLOCK } from './constants.js';
import { blockText, plainText } from './quizDoses.js';

// The fields an editor can change, by question kind. "card" is a medicines quiz card; the others
// are guideline quiz questions. Lists are written one item per line in the editor.
export const EDIT_FIELDS = {
  card: ['prompt', 'answer'],
  order: ['title', 'steps', 'wrong'],
  number: ['answer', 'wrong'],
  situation: ['line', 'answer', 'wrong'],
  'red-flag': ['answer', 'wrong'],
  'move-to': ['line', 'answer', 'wrong'],
};
export const LIST_FIELDS = ['steps', 'wrong'];
// Wrong answers are random unless an editor chose them, so they are not compared on review.
const UNREVIEWED_FIELD = 'wrong';

export const REVIEW = { NONE: '', CHANGED: 'changed', GONE: 'gone' };

// A number question's line is not edited, but a change to it is what an editor must check.
const EXTRA_REVIEWED_FIELDS = { number: ['line'] };
const reviewedFields = (kind) => [
  ...(EXTRA_REVIEWED_FIELDS[kind] || []),
  ...EDIT_FIELDS[kind].filter((name) => name !== UNREVIEWED_FIELD),
];

/** The fields of a question that a guideline update is checked against: { name: value }. */
export function snapshot(question) {
  const fields = {};
  reviewedFields(question.kind).forEach((name) => (fields[name] = question[name]));
  return fields;
}

/** The question with an edit's fields in place, or null when the edit turns it off. */
export function withEdit(question, edit) {
  if (!edit) return question;
  if (edit.off) return null;
  const edited = { ...question, isEdited: true };
  EDIT_FIELDS[question.kind].forEach((name) => {
    if (edit[name] !== undefined) edited[name] = edit[name];
  });
  return edited;
}

/** Whether an edit needs an editor: its question is gone, or changed since it was edited. */
export function reviewState(question, edit) {
  if (!question) return REVIEW.GONE;
  const same = JSON.stringify(snapshot(question)) === JSON.stringify(edit.was);
  return same ? REVIEW.NONE : REVIEW.CHANGED;
}

/** A card answer as editable text: one line per block, "- " before bullets (indented by level). */
export function blocksToText(blocks) {
  return blocks
    .map((block) => {
      if (block[0] === BLOCK.BULLET) return `${'  '.repeat(block[2] - 1)}- ${blockText(block)}`;
      if (block[0] === BLOCK.TABLE) {
        return block[1]
          .map((row) => row.map((cell) => (cell ? plainText(cell.t) : '')).join(' | '))
          .join('\n');
      }
      return blockText(block);
    })
    .join('\n');
}

// Only what plainText() turns back, so an answer reads the same when it is edited again.
const asMarkup = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const BULLET_LINE = /^( *)- (.*)$/;
const INDENT = 2;

/** Edited answer text back into content blocks: "- " lines are bullets, others paragraphs. */
export function textToBlocks(text) {
  return String(text)
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const bullet = BULLET_LINE.exec(line);
      if (!bullet) return [BLOCK.PARAGRAPH, asMarkup(line.trim())];
      const level = Math.floor(bullet[1].length / INDENT) + 1;
      return [BLOCK.BULLET, asMarkup(bullet[2].trim()), level];
    });
}

/** Medicines quiz cards with edits applied: changed prompt or answer, turned-off cards removed. */
export function applyCardEdits(cards, edits) {
  return cards.flatMap((card) => {
    const edit = edits[card.id];
    if (!edit) return [card];
    if (edit.off) return [];
    const changed = { ...card };
    if (edit.prompt !== undefined) changed.prompt = edit.prompt;
    if (edit.answer !== undefined) changed.answerBlocks = textToBlocks(edit.answer);
    return [changed];
  });
}

/** A medicines quiz card as an editable question: { id, kind, prompt, answer, source }. */
export const cardQuestion = (card) => ({
  id: card.id,
  kind: 'card',
  prompt: card.prompt,
  answer: blocksToText(card.answerBlocks),
  source: card.source,
});
