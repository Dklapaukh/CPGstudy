/*
 * Editor page: markup for its screens (sign in, the guideline list, one guideline's questions).
 * Each function takes prepared data and returns text; main.js puts it on the page and handles
 * the clicks. Question text and edits are escaped before they reach the page.
 * Depends on logic.js, quizDoses.js, questionEdits.js and manager/view.js.
 */
import { escapeHtml } from '../logic.js';
import { EDIT_FIELDS, LIST_FIELDS, REVIEW } from '../questionEdits.js';
import { coverHtml, warningHtml } from '../manager/view.js';
import { plainText } from '../quizDoses.js';

const PAGE_NAME = 'Editor';
const POOL_EXAMPLES = 3;

export const KIND_LABELS = {
  card: 'Medicines card',
  order: 'Ordering round',
  number: 'Number question',
  situation: 'Which situation',
  'red-flag': 'Red flag',
  'move-to': 'Move to guideline',
};
const FIELD_LABELS = {
  prompt: 'Question',
  answer: 'Right answer',
  title: 'Situation title',
  steps: 'Steps, in order',
  wrong: 'Wrong answers',
  line: 'Line shown',
};
// Extra help under a box of the form.
const FIELD_HINTS = {
  answer: 'Start a line with "- " for a bullet; two spaces before it for a bullet under a bullet.',
  steps: 'One step per line.',
  wrong: 'One per line. Leave empty to have them chosen at random each time.',
};
const NONE = '(none)';

const SIGNED_IN_BUTTONS =
  '<button class="switch-button" type="button" data-action="refresh">Refresh</button>' +
  '<button class="switch-button" type="button" data-action="sign-out">Sign out</button>';

const cover = (subtitle, buttons = '') => coverHtml(subtitle, buttons, PAGE_NAME);
const asText = (value) => (Array.isArray(value) ? value.join('\n') : String(value ?? ''));

/** The sign-in screen, with an optional message. `isLoading` greys the button while waiting. */
export function signInHtml(message, isLoading) {
  return `${cover('Quiz question editor')}
    <main class="page-padding manager-narrow">${warningHtml(message)}
    <p class="subtitle">Type your editor passcode. It isn’t case sensitive.</p>
    <label class="visually-hidden" for="editor-passcode">Passcode</label>
    <input class="text-input" id="editor-passcode" type="password" placeholder="Passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">
    <button class="button" type="button" data-action="sign-in"${isLoading ? ' disabled' : ''}>
      ${isLoading ? 'Opening…' : 'Open'}</button></main>`;
}

/** One line of the guideline list, with how many of its questions are edited. */
export function guidelineRowsHtml(rows) {
  if (rows.length === 0) return '<p class="stats-note">No guideline matches.</p>';
  return `<ul class="editor-list">${rows
    .map(
      (row) => `<li><a class="person-link" href="#g-${escapeHtml(row.id)}">
        ${escapeHtml(row.number)} ${escapeHtml(row.title)}</a>
        <span class="stats-note">${row.questionCount} questions${
          row.editCount ? `, ${row.editCount} edited` : ''
        }</span></li>`,
    )
    .join('')}</ul>`;
}

/** The first screen: edits needing review, then a searchable list of guidelines. */
export function homeHtml(viewer, reviewItems, rows, search) {
  const review = reviewItems.length
    ? `<section class="stats-section"><h2>Needs review (${reviewItems.length})</h2>
      <p class="stats-note">The guideline changed after these were edited. Until you choose,
      the app keeps showing the edit.</p>
      <ul class="editor-list">${reviewItems
        .map(
          (
            item,
          ) => `<li><a class="person-link" href="#g-${escapeHtml(item.guidelineId)}">${escapeHtml(item.label)}</a>
            <span class="stats-note">${item.review === REVIEW.GONE ? 'question removed' : 'question changed'}</span></li>`,
        )
        .join('')}</ul></section>`
    : '';
  return `${cover(`Signed in as ${viewer.name}`, SIGNED_IN_BUTTONS)}
    <main class="page-padding">${warningHtml(viewer.message)}${review}
    <section class="stats-section"><h2>Guidelines</h2>
    <p class="stats-note">Saved edits reach the app the next morning.</p>
    <label class="visually-hidden" for="editor-search">Find a guideline</label>
    <input class="text-input" id="editor-search" type="search" placeholder="Find a guideline"
      value="${escapeHtml(search)}">
    <div id="editor-rows">${guidelineRowsHtml(rows)}</div></section></main>`;
}

/** A field's value for reading: a list as lines, wrong answers left random described. */
function fieldValueHtml(question, name) {
  const value = question[name];
  if (name === 'wrong' && !(Array.isArray(value) && value.length)) {
    // Ordering rounds' pools are cards ({ text, source }); the others' are plain text.
    const examples = (question.pool || [])
      .slice(0, POOL_EXAMPLES)
      .map((choice) => plainText(choice.text ?? choice));
    if (!question.pool) return '<i>Chosen at random from similar numbers</i>';
    if (question.pool.length === 0) return '<i>None to choose from: add some to ask this</i>';
    const from = `from ${question.pool.length}, such as: ${examples.join('; ')}`;
    return `<i>Chosen at random ${escapeHtml(from)}</i>`;
  }
  if (Array.isArray(value)) {
    return `<ol>${value.map((item) => `<li>${escapeHtml(asText(item))}</li>`).join('')}</ol>`;
  }
  return `<span class="editor-text">${escapeHtml(asText(value)) || NONE}</span>`;
}

/** The fields of a question for reading, as a definition list. `names` are the fields shown. */
function fieldsHtml(question, names = EDIT_FIELDS[question.kind]) {
  // A built number question shows its line with the blank; a saved copy has the whole line.
  const shown =
    question.before === undefined || names.includes('line')
      ? ''
      : `<dt>Line</dt><dd>${escapeHtml(question.before)}<b>____</b>${escapeHtml(question.after)}</dd>`;
  return `<dl class="editor-fields">${shown}${names
    .map((name) => `<dt>${FIELD_LABELS[name]}</dt><dd>${fieldValueHtml(question, name)}</dd>`)
    .join('')}</dl>`;
}

/** The form for editing a question: one box per field, prefilled with what learners see now. */
function formHtml(item) {
  const { live, edit } = item;
  const boxes = EDIT_FIELDS[live.kind]
    .map((name) => {
      const value = name === 'wrong' && !edit?.wrong ? '' : asText(live[name]);
      const rows = LIST_FIELDS.includes(name) || name === 'answer' ? 5 : 2;
      const hint = item.live.kind === 'card' || name !== 'answer' ? FIELD_HINTS[name] : '';
      return `<label class="editor-label" for="field-${name}">${FIELD_LABELS[name]}</label>
        ${hint ? `<p class="stats-note">${escapeHtml(hint)}</p>` : ''}
        <textarea class="text-input editor-box" id="field-${name}" data-field="${name}"
          rows="${rows}">${escapeHtml(value)}</textarea>`;
    })
    .join('');
  return `<div class="editor-form">${boxes}
    <label class="editor-check"><input type="checkbox" id="field-off"${edit?.off ? ' checked' : ''}>
      Leave this question out of the quiz</label>
    <div class="editor-buttons">
      <button class="button" type="button" data-action="save" data-id="${escapeHtml(item.id)}">Save</button>
      <button class="switch-button" type="button" data-action="close">Cancel</button>
    </div></div>`;
}

/** Then, the edit and now side by side, for an edit whose question changed or went. */
function reviewHtml(item) {
  const { question, edit } = item;
  const names = [...new Set([...Object.keys(edit.was || {}), ...EDIT_FIELDS[item.kind]])];
  const column = (heading, body) => `<div class="editor-column"><h4>${heading}</h4>${body}</div>`;
  const button = (action, label, style = 'switch-button') =>
    `<button class="${style}" type="button" data-action="${action}" data-id="${escapeHtml(item.id)}">${label}</button>`;
  // Learners get the edit's fields over the question as it is built now.
  const seen = item.live || { kind: item.kind, ...edit.was, ...edit };
  const now = question
    ? fieldsHtml(question, names)
    : '<p><i>This question is no longer built.</i></p>';
  return `<div class="editor-review"><div class="editor-columns">
      ${column('When edited', fieldsHtml({ kind: item.kind, pool: question?.pool, ...edit.was }, names))}
      ${column('Learners see now', fieldsHtml(seen, names))}
      ${column('Now in the guideline', now)}</div>
    <div class="editor-buttons">
      ${question ? button('keep', 'Keep the edit', 'button') : ''}
      ${button('remove', question ? 'Use the guideline’s version' : 'Remove the edit')}
      ${question ? button('open', 'Edit') : ''}
    </div></div>`;
}

/** Labels beside a question: edited, left out, not yet published, needs review. */
function badgesHtml(item) {
  const badges = [];
  if (item.edit) badges.push(item.edit.off ? 'Left out' : 'Edited');
  if (item.edit && !item.isPublished) badges.push('Not in the app yet');
  if (item.review) badges.push('Needs review');
  if (!item.edit && item.isPublished === false) badges.push('Edit removed, not in the app yet');
  return badges.map((badge) => `<span class="editor-badge">${badge}</span>`).join('');
}

/** One question: what learners see now, then the form or the review when it is open. */
function questionHtml(item, isOpen) {
  const head = `<h3 class="editor-question__head">${KIND_LABELS[item.kind]} ${badgesHtml(item)}</h3>`;
  let body;
  if (item.review && !isOpen) body = reviewHtml(item);
  else if (isOpen) body = formHtml(item);
  else {
    body = `${fieldsHtml(item.live)}<div class="editor-buttons">
      <button class="switch-button" type="button" data-action="open" data-id="${escapeHtml(item.id)}">Edit</button>
      ${item.edit ? `<button class="switch-button" type="button" data-action="remove" data-id="${escapeHtml(item.id)}">Undo the edit</button>` : ''}
    </div>`;
  }
  return `<article class="editor-question" id="q-${escapeHtml(item.id)}">${head}${body}</article>`;
}

/** One guideline's screen: every question, in the order the app asks them. */
export function guidelineHtml(viewer, guideline, items, openId) {
  return `${cover(`Signed in as ${viewer.name}`, SIGNED_IN_BUTTONS)}
    <main class="page-padding">${warningHtml(viewer.message)}
    <a class="person-link" href="#">← All guidelines</a>
    <h2 class="person-name">${escapeHtml(guideline.number)} ${escapeHtml(guideline.title)}</h2>
    <p class="stats-note">What learners see now, edits included. Saved edits reach the app the
    next morning.</p>
    ${items.map((item) => questionHtml(item, item.id === openId)).join('')}</main>`;
}
