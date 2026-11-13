/*
 * The single guideline screen: the guideline text with folding headings and comment highlights,
 * then the status buttons and notes, then the review queue and related guidelines.
 * Drawn from the state. Depends on state.js, guidelines.js, logic.js, comments.js, templates.js.
 */
import { state, saveSession } from '../state.js';
import { guidelines } from '../guidelines.js';
import { getStatus, escapeHtml, formatUpdatedDate, nextTimestamp, markedTime } from '../logic.js';
import { notesHaveComment } from '../comments.js';
import { scheduleSync, updateSyncStatus } from '../sync.js';
import { bodyHtml, aiNoticeHtml } from './templates.js';
import { reviewPanelsHtml, refreshQueueViews } from './queueView.js';
import { quizzedGuidelines } from '../guidelineQuizState.js';
import { documentInfo } from '../../content/guidelines.js';
import { STATUS, MESSAGES, DEFAULT_HEADER_COLOUR } from '../constants.js';

const app = document.getElementById('app');
const byId = (id) => document.getElementById(id);

// No Incomplete button: a guideline leaves Incomplete by being marked, and pressing Review or
// Complete again (even when already selected) updates the date shown on its card.
const STATUS_BUTTONS = [
  [STATUS.REVIEW, 'review', 'Review'],
  [STATUS.COMPLETE, 'complete', 'Complete'],
];

/** True when the guideline quiz has a play for this guideline (treatment guidelines only). */
const hasGuidelineQuiz = (guidelineId) =>
  quizzedGuidelines().some((quizzed) => quizzed.id === guidelineId);

/**
 * The Review and Complete pills, plus a Quiz pill that opens this guideline's quiz when it has
 * one. The Quiz pill is not a status, so it has no pressed state.
 */
function statusButtonsHtml(guidelineId, currentStatus) {
  const buttons = STATUS_BUTTONS.map(
    ([code, name, text]) => `<button class="status-button status-button--${name}"
      data-action="set-status" data-status="${code}"
      aria-pressed="${currentStatus === code}">${text}</button>`,
  ).join('');
  const quizButton = hasGuidelineQuiz(guidelineId)
    ? `<button class="status-button status-button--quiz" type="button"
      data-action="quiz-this-guideline">Quiz</button>`
    : '';
  return `<div class="status-buttons" role="group" aria-label="Status">${buttons}${quizButton}</div>`;
}

/** The line under the status buttons: when the guideline was last marked, or how to mark it. */
export function markedLineText(guidelineId) {
  const markedAt = markedTime(state.entries, guidelineId);
  if (!markedAt) return 'Not marked yet · press Review or Complete when studied';
  const prefix = MESSAGES.MARKED_PREFIX[getStatus(state.entries, guidelineId)];
  return `${prefix} ${formatUpdatedDate(markedAt)} · press again to update`;
}

function neighbourLinkHtml(guideline, isNext) {
  if (!guideline) return '<span class="neighbour-nav__spacer"></span>';
  const cssClass = isNext ? ' class="neighbour-nav__next"' : '';
  const caption = isNext ? 'Next ›' : '‹ Previous';
  return `<a${cssClass} href="#${guideline.id}"><small>${caption}</small>
    ${escapeHtml(guideline.t)}</a>`;
}

/** Draws the guideline at `index` in the guideline list. */
export function renderGuidelineDetail(index) {
  const guideline = guidelines[index];
  const entry = state.entries[guideline.id] || {};
  const updated = entry.t ? `Updated ${formatUpdatedDate(entry.t)}` : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="guideline-header"
      style="--header-colour:${guideline.hc || DEFAULT_HEADER_COLOUR}">
      <h1>${escapeHtml(guideline.t)}</h1>
      <div class="guideline-meta">CPG EAS ${guideline.n} St John New Zealand<br>
        Uncontrolled document exported ${documentInfo.exportedOn}<br>
        ${documentInfo.sourceLine}</div></div>
    <div class="page-padding">${aiNoticeHtml()}<div class="guideline-body">${bodyHtml(guideline.b)}</div>
      <section class="guideline-progress" aria-label="Your progress on this guideline">
      ${statusButtonsHtml(guideline.id, getStatus(state.entries, guideline.id))}
      <p class="marked-line" id="marked-line">${markedLineText(guideline.id)}</p>
      <textarea id="notes-input"
        placeholder="Notes for this guideline (what you covered, what to revisit)"
        >${escapeHtml(entry.n || '')}</textarea>
      <div class="save-hint"><span id="updated-date">${updated}</span><span class="sync-status"></span></div></section>
      <div id="review-panels">${reviewPanelsHtml(guideline)}</div></div>
    <div class="neighbour-nav">${neighbourLinkHtml(guidelines[index - 1], false)}
      ${neighbourLinkHtml(guidelines[index + 1], true)}</div>`;
  window.scrollTo(0, 0);
  state.currentGuideline = guideline;
  updateSyncStatus();
  updateCommentHighlights();
}

/**
 * Records a status or notes change for the open guideline: updates the state, queues the change
 * for upload and saves it on the phone.
 */
export function recordEdit(status, notes) {
  const id = state.currentGuideline.id;
  const previous = state.entries[id];
  const timestamp = nextTimestamp(previous ? previous.t : 0, Date.now());
  state.entries[id] = { s: status, n: notes, t: timestamp };
  state.pendingChanges[id] = { s: status, n: notes, t: timestamp };
  saveSession();
  byId('updated-date').textContent = state.storageBlocked
    ? MESSAGES.SAVE_FAILED
    : `Updated ${formatUpdatedDate(timestamp)}`;
  updateSyncStatus();
  scheduleSync();
}

/** Shows which status button is selected and when the guideline was last marked. */
export function showSelectedStatus(status) {
  app.querySelectorAll('[data-action="set-status"]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.status === status);
  });
  const markedLine = byId('marked-line');
  if (markedLine && state.currentGuideline) {
    markedLine.textContent = markedLineText(state.currentGuideline.id);
  }
}

/** Re-reads the open guideline from the state after new data arrived from the server. */
export function refreshDetailFromState() {
  const entry = state.entries[state.currentGuideline.id] || {};
  showSelectedStatus(entry.s || STATUS.INCOMPLETE);
  const notes = byId('notes-input');
  // Never overwrite notes the person is typing right now.
  if (notes && document.activeElement !== notes) notes.value = entry.n || '';
  updateCommentHighlights();
  refreshQueueViews();
}

const COMMENT_POINT_SELECTOR = '.bullet-row, .key-row';

/** The text of every point of the open guideline that can take a comment, in page order. */
export function commentPointTexts() {
  return [...app.querySelectorAll(COMMENT_POINT_SELECTOR)].map((row) => {
    const span = row.querySelector('span');
    return span ? span.textContent : '';
  });
}

/**
 * Highlights the points that have a comment in the notes, and marks a heading when any point
 * under it has one. Called after every draw and every notes change (no timer needed).
 */
export function updateCommentHighlights() {
  const notes = byId('notes-input');
  const notesText = notes ? notes.value : '';
  const pointTexts = commentPointTexts();
  app.querySelectorAll(COMMENT_POINT_SELECTOR).forEach((row, index) => {
    row.classList.toggle('has-comment', notesHaveComment(notesText, pointTexts[index], pointTexts));
  });
  app.querySelectorAll('.heading-section').forEach((section) => {
    const heading = section.previousElementSibling;
    if (heading) {
      heading.classList.toggle(
        'heading-bar--has-comment',
        Boolean(section.querySelector('.has-comment')),
      );
    }
  });
}

/**
 * Where the student is on the open guideline: its id, the scroll position and which headings
 * are unfolded. Saved before the Quiz pill opens the quiz, so the quiz can come back here.
 */
export function currentGuidelinePlace() {
  return {
    guidelineId: state.currentGuideline.id,
    scrollY: window.scrollY,
    openHeadings: [...app.querySelectorAll('.heading-section')].map((section) => !section.hidden),
  };
}

/** Puts the open guideline back to a place saved by currentGuidelinePlace. */
export function restoreGuidelinePlace(place) {
  app.querySelectorAll('.heading-section').forEach((section, index) => {
    if (index >= place.openHeadings.length) return;
    section.hidden = !place.openHeadings[index];
    const heading = section.previousElementSibling;
    if (heading) heading.setAttribute('aria-expanded', place.openHeadings[index]);
  });
  window.scrollTo(0, place.scrollY);
}

/** Folds or unfolds the content under a heading. */
export function toggleHeading(heading) {
  const section = heading.nextElementSibling;
  const willOpen = section.hidden;
  section.hidden = !willOpen;
  heading.setAttribute('aria-expanded', willOpen);
}
