/*
 * The single guideline screen: status buttons, notes, folding headings and comment highlights.
 * Drawn from the state. Depends on state.js, guidelines.js, logic.js, comments.js, templates.js.
 */
import { state, saveSession } from '../state.js';
import { guidelines } from '../guidelines.js';
import { getStatus, escapeHtml, formatUpdatedDate, nextTimestamp } from '../logic.js';
import { notesHaveComment } from '../comments.js';
import { scheduleSync, updateSyncStatus } from '../sync.js';
import { bodyHtml } from './templates.js';
import { reviewPanelsHtml, refreshQueueViews } from './queueView.js';
import { documentInfo } from '../../content/guidelines.js';
import { STATUS, MESSAGES, DEFAULT_HEADER_COLOUR } from '../constants.js';

const app = document.getElementById('app');
const byId = (id) => document.getElementById(id);

const STATUS_BUTTONS = [
  [STATUS.INCOMPLETE, 'incomplete', 'Incomplete'],
  [STATUS.REVIEW, 'review', 'Review'],
  [STATUS.COMPLETE, 'complete', 'Complete'],
];

function statusButtonsHtml(currentStatus) {
  const buttons = STATUS_BUTTONS.map(
    ([code, name, text]) => `<button class="status-button status-button--${name}"
      data-action="set-status" data-status="${code}"
      aria-pressed="${currentStatus === code}">${text}</button>`,
  ).join('');
  return `<div class="status-buttons" role="group" aria-label="Status">${buttons}</div>`;
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
    <div class="page-padding">${statusButtonsHtml(getStatus(state.entries, guideline.id))}
      <textarea id="notes-input"
        placeholder="Notes for this guideline (what you covered, what to revisit)"
        >${escapeHtml(entry.n || '')}</textarea>
      <div class="save-hint"><span id="updated-date">${updated}</span><span class="sync-status"></span></div>
      <div class="guideline-body">${bodyHtml(guideline.b)}</div>
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

/** Shows which status button is selected. */
export function showSelectedStatus(status) {
  app.querySelectorAll('[data-action="set-status"]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.status === status);
  });
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

/**
 * Highlights the points that have a comment in the notes, and marks a heading when any point
 * under it has one. Called after every draw and every notes change (no timer needed).
 */
export function updateCommentHighlights() {
  const notes = byId('notes-input');
  const notesText = notes ? notes.value : '';
  app.querySelectorAll('.bullet-row, .key-row').forEach((row) => {
    const span = row.querySelector('span');
    row.classList.toggle('has-comment', notesHaveComment(notesText, span && span.textContent));
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

/** Folds or unfolds the content under a heading. */
export function toggleHeading(heading) {
  const section = heading.nextElementSibling;
  const willOpen = section.hidden;
  section.hidden = !willOpen;
  heading.setAttribute('aria-expanded', willOpen);
}
