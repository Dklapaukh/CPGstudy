/*
 * Editor page: markup for its screens (sign in, the guideline list, one guideline's questions).
 * The screens are laid out like the study app's: the sign-in cover, the list header with
 * folding sections, and the coloured guideline header. Each function takes prepared data and
 * returns text; main.js puts it on the page and handles the clicks. Question text and edits are
 * escaped before they reach the page.
 * Depends on logic.js, constants.js, quizDoses.js, questionEdits.js and views/templates.js.
 */
import { escapeHtml } from '../logic.js';
import { DEFAULT_HEADER_COLOUR } from '../constants.js';
import { EDIT_FIELDS, LIST_FIELDS, REVIEW } from '../questionEdits.js';
import { aiNoticeHtml, coverHtml } from '../views/templates.js';
import { plainText } from '../quizDoses.js';

const PAGE_NAME = 'Question editor';
const POOL_EXAMPLES = 3;

const KIND_LABELS = {
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
const SIGNED_IN_BUTTONS = `<div class="top-bar__buttons">
  <button class="switch-button" type="button" data-action="refresh">Refresh</button>
  <button class="switch-button" type="button" data-action="sign-out">Sign out</button></div>`;
const PUBLISH_NOTE = 'Saved edits reach the app the next morning.';

const asText = (value) => (Array.isArray(value) ? value.join('\n') : String(value ?? ''));
const note = (text) => `<p class="editor-note">${text}</p>`;
const warningHtml = (message) =>
  message ? `<div class="warning-message" role="alert">${escapeHtml(message)}</div>` : '';

/** The sign-in screen, with an optional message. `isLoading` greys the button while waiting. */
export function signInHtml(message, isLoading) {
  return `${coverHtml({ labelHtml: PAGE_NAME, subtitleHtml: 'Quiz question editor · enter your passcode' })}
    <main class="page-padding">${warningHtml(message)}
    <p class="subtitle">Type your editor passcode. It isn’t case sensitive.</p>
    <label class="visually-hidden" for="editor-passcode">Passcode</label>
    <input class="text-input" id="editor-passcode" type="password" placeholder="Passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">
    <button class="button" type="button" data-action="sign-in"${isLoading ? ' disabled' : ''}>
      ${isLoading ? 'Opening…' : 'Open'}</button>${aiNoticeHtml()}</main>`;
}

/** One guideline as a row of the list, as in the study app, with a label on the right. */
function rowHtml(href, title, small, label = '') {
  const meta = label
    ? `<span class="row-meta"><span class="editor-badge">${label}</span></span>`
    : '';
  return `<a class="guideline-row" href="${href}"><div class="guideline-row__text">
    <b>${escapeHtml(title)}</b><small>${escapeHtml(small)}</small></div>${meta}</a>`;
}

/** A folding section of rows. `count` is the number shown at the right of its name. */
function sectionHtml(name, count, rows, isOpen) {
  return `<details class="section-group" data-section="${escapeHtml(name)}"${isOpen ? ' open' : ''}>
    <summary><span class="section-name">${escapeHtml(name)}</span>
    <span class="section-count">${count}</span></summary>${rows.join('')}</details>`;
}

/**
 * The guideline list in its sections, each with how many of its questions are edited.
 * Every section is open while searching; otherwise the ones in `openSections` are.
 */
export function guidelineRowsHtml(rows, openSections, isSearching) {
  if (rows.length === 0) return '<p class="empty-message">No guideline matches.</p>';
  const bySection = new Map();
  rows.forEach((row) => {
    if (!bySection.has(row.section)) bySection.set(row.section, []);
    bySection.get(row.section).push(row);
  });
  return [...bySection]
    .map(([name, sectionRows]) =>
      sectionHtml(
        name,
        sectionRows.length,
        sectionRows.map((row) =>
          rowHtml(
            `#g-${escapeHtml(row.id)}`,
            row.title,
            `CPG EAS ${row.number} · ${row.questionCount} questions`,
            row.editCount ? `${row.editCount} edited` : '',
          ),
        ),
        isSearching || Boolean(openSections[name]),
      ),
    )
    .join('');
}

/** The list header, like the study app's: name and buttons, title, then the search box. */
function homeHeaderHtml(viewer, search) {
  return `<header class="home-header">
    <div class="top-bar"><b class="tracker-label">${escapeHtml(viewer.name)}</b>
    ${SIGNED_IN_BUTTONS}</div>
    <h1>Clinical Practice Guidelines<br><span class="home-header__edition">${PAGE_NAME}</span></h1>
    <label class="visually-hidden" for="editor-search">Find a guideline</label>
    <input class="text-input" id="editor-search" type="search" placeholder="Search number or title"
      value="${escapeHtml(search)}" autocomplete="off"></header>`;
}

/** The first screen: edits needing review, then the guidelines in their sections. */
export function homeHtml(viewer, reviewItems, rows, list) {
  const review = reviewItems.length
    ? `${note('The guideline changed after these were edited. Until you choose, the app keeps showing the edit.')}
      ${sectionHtml(
        `Needs review (${reviewItems.length})`,
        '',
        reviewItems.map((item) =>
          rowHtml(
            `#g-${escapeHtml(item.guidelineId)}`,
            item.where,
            KIND_LABELS[item.kind],
            item.review === REVIEW.GONE ? 'question removed' : 'question changed',
          ),
        ),
        true,
      )}`
    : '';
  return `${homeHeaderHtml(viewer, list.search)}
    <main class="page-padding">${warningHtml(viewer.message)}${review}${note(PUBLISH_NOTE)}
    <div id="editor-rows">${guidelineRowsHtml(rows, list.openSections, Boolean(list.search.trim()))}</div>
    </main>`;
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
        ${hint ? note(escapeHtml(hint)) : ''}
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

/** One guideline's screen: its coloured header, then every question in the order asked. */
export function guidelineHtml(viewer, guideline, items, openId) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${SIGNED_IN_BUTTONS}</div>
    <div class="guideline-header" style="--header-colour:${guideline.colour || DEFAULT_HEADER_COLOUR}">
      <h1>${escapeHtml(guideline.title)}</h1>
      <div class="guideline-meta">CPG EAS ${escapeHtml(guideline.number)} · ${items.length} questions<br>
        Signed in as ${escapeHtml(viewer.name)}</div></div>
    <main class="page-padding">${warningHtml(viewer.message)}
    ${note(`What learners see now, edits included. ${PUBLISH_NOTE}`)}
    ${items.map((item) => questionHtml(item, item.id === openId)).join('')}</main>`;
}
