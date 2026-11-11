/*
 * The review queue and related-guideline panels, and the Review queue screen.
 * Drawn from the state. Depends on state.js, guidelines.js, logic.js, queue.js, related.js,
 * queueState.js and content/related.js. Does not import the guideline screen (it imports us).
 */
import { state } from '../state.js';
import { guidelines } from '../guidelines.js';
import { getStatus, escapeHtml } from '../logic.js';
import { queueProgress, queueRoom } from '../queue.js';
import { rankRelated } from '../related.js';
import { getQueue } from '../queueState.js';
import { relatedLinks } from '../../content/related.js';
import { STATUS, RELATED_REASON_TEXT } from '../constants.js';

const app = document.getElementById('app');

const STATUS_TEXT = {
  [STATUS.INCOMPLETE]: 'Incomplete',
  [STATUS.REVIEW]: 'Needs review',
  [STATUS.COMPLETE]: 'Complete',
};
const STATUS_DOT_CLASS = {
  [STATUS.INCOMPLETE]: '',
  [STATUS.REVIEW]: ' status-dot--review',
  [STATUS.COMPLETE]: ' status-dot--complete',
};

const guidelineById = (id) => guidelines.find((guideline) => guideline.id === id);

function statusDotHtml(status) {
  return `<i class="status-dot${STATUS_DOT_CLASS[status]}"></i>`;
}

/** The related guidelines to show for one guideline: [{ id, reason }] (unknown ids dropped). */
function relatedItems(guidelineId) {
  const ranked = rankRelated(relatedLinks[guidelineId] || [], state.entries);
  return ranked.filter((item) => guidelineById(item.id));
}

function addButtonHtml(guideline, queue) {
  const isQueued = queue.some((item) => item.id === guideline.id);
  const text = isQueued
    ? 'In queue'
    : queueRoom(queue) === 0
      ? 'Queue full'
      : 'Add to review queue';
  const disabled = isQueued || queueRoom(queue) === 0 ? ' disabled' : '';
  return `<button class="queue-add-button" type="button" data-action="add-to-queue"
    data-id="${escapeHtml(guideline.id)}"
    aria-label="${escapeHtml(`${text}: ${guideline.t}`)}"${disabled}>${text}</button>`;
}

function relatedItemHtml(item, queue) {
  const guideline = guidelineById(item.id);
  const status = getStatus(state.entries, item.id);
  const reason = RELATED_REASON_TEXT[item.reason] || '';
  return `<li class="related-item"><a class="related-item__link" href="#${escapeHtml(item.id)}">
    ${statusDotHtml(status)}<span><b>${escapeHtml(guideline.t)}</b>
    <small>CPG EAS ${guideline.n} · ${STATUS_TEXT[status]} · ${reason}</small></span></a>
    ${addButtonHtml(guideline, queue)}</li>`;
}

function relatedPanelHtml(guideline, queue) {
  const items = relatedItems(guideline.id);
  if (!items.length) return '';
  const canAddMore =
    queueRoom(queue) > 0 && items.some((item) => !queue.some((q) => q.id === item.id));
  return `<section class="related-panel" aria-labelledby="related-heading">
    <h2 id="related-heading">Related guidelines</h2>
    <p class="related-panel__hint">Studying related guidelines together helps you remember them.</p>
    <ul class="related-list">${items.map((item) => relatedItemHtml(item, queue)).join('')}</ul>
    <button class="queue-add-all-button" type="button" data-action="add-all-to-queue"
      ${canAddMore ? '' : 'disabled'}>Add all to review queue</button></section>`;
}

function queueItemHtml(item) {
  const guideline = guidelineById(item.id);
  const status = getStatus(state.entries, item.id);
  const tick = item.done ? '<span class="queue-item__tick">✓ Done</span>' : '';
  return `<li class="queue-item"><a class="queue-item__link" href="#${escapeHtml(item.id)}">
    ${statusDotHtml(status)}<span><b>${escapeHtml(guideline.t)}</b>
    <small>CPG EAS ${guideline.n} · ${STATUS_TEXT[status]}</small></span></a>${tick}
    <button class="queue-remove-button" type="button" data-action="remove-from-queue"
      data-id="${escapeHtml(item.id)}"
      aria-label="${escapeHtml(`Remove ${guideline.t} from the review queue`)}">Remove</button></li>`;
}

/** The queue with its progress, for example "2 of 5 done". Empty text when nothing is queued. */
function queuePanelHtml(queue) {
  const items = queue.filter((item) => guidelineById(item.id));
  if (!items.length) return '';
  const { done, total } = queueProgress(items);
  return `<section class="queue-panel" aria-labelledby="queue-heading">
    <h2 id="queue-heading">Review queue</h2>
    <p class="queue-panel__progress">${done} of ${total} done</p>
    <ul class="queue-list">${items.map(queueItemHtml).join('')}</ul></section>`;
}

/** Both panels for the guideline screen. */
export function reviewPanelsHtml(guideline) {
  const queue = getQueue();
  return queuePanelHtml(queue) + relatedPanelHtml(guideline, queue);
}

/** The "Review queue (n)" button for the list screen. Empty text when nothing is queued. */
export function queueButtonHtml() {
  const count = getQueue().filter((item) => guidelineById(item.id)).length;
  if (!count) return '';
  return `<a class="queue-button" href="#queue">Review queue (${count})</a>`;
}

/** Draws the Review queue screen. */
export function renderQueueScreen() {
  const panel = queuePanelHtml(getQueue());
  const body = panel || '<p class="empty-message">Your review queue is empty.</p>';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding queue-screen"><span class="sync-status"></span>${body}</div>`;
  window.scrollTo(0, 0);
}

/** Redraws whichever of the guideline screen's panels or the queue screen is showing. */
export function refreshQueueViews() {
  if (app.querySelector('.queue-screen')) {
    renderQueueScreen();
    return;
  }
  const container = app.querySelector('#review-panels');
  if (container && state.currentGuideline) {
    container.innerHTML = reviewPanelsHtml(state.currentGuideline);
  }
}

/** Ids of the related guidelines shown for the open guideline, for "Add all". */
export function shownRelatedIds() {
  return state.currentGuideline ? relatedItems(state.currentGuideline.id).map((i) => i.id) : [];
}
