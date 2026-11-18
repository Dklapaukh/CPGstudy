/*
 * Editor page: markup for jobs sent with the Add a scenario form (submit.html) and waiting for
 * approval. The list is one folding section on the first screen; one job (#j-<id>) is drawn as
 * the scenario learners would see, by the app's own markup, with Edit and approve, Approve as
 * it is, and Reject.
 * Each function takes prepared data and returns text; main.js handles the clicks.
 * Depends on logic.js, constants.js, staffPage.js and views/scenarioMarkup.js.
 */
import { escapeHtml } from '../logic.js';
import { warningHtml, noteHtml, actionButtonHtml, dataIdAttr } from '../staffPage.js';
import { DEFAULT_HEADER_COLOUR } from '../constants.js';
import { scenarioBodyHtml, scenarioTagsText } from '../views/scenarioMarkup.js';

export const SUBMISSION_HASH_PREFIX = '#j-';
// The Edit and approve form for a job (the new scenario form, filled in from it).
export const APPROVE_HASH_PREFIX = '#approve-';

// Draws the scenario as an editor sees one (folds open, guidelines as text, not links), with
// nothing to tap: a job is approved or rejected as it is, and edited once it is in the app.
const READ_ONLY = { attrs: () => '', formFor: () => '', readOnly: true };
// A button for one job, by its id.
const jobButton = (action, label, id, style) =>
  actionButtonHtml(action, label, dataIdAttr(id), style);

/** The day a job was sent, as "19 Nov 2026" ('' when unreadable). */
function sentDate(sent) {
  const date = new Date(sent);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The first screen's section of jobs to check, open, oldest first; nothing when there are none. */
export function submissionSectionHtml(submissions) {
  if (!submissions.length) return '';
  const rows = submissions
    .map(
      (
        submission,
      ) => `<a class="guideline-row" href="${SUBMISSION_HASH_PREFIX}${escapeHtml(submission.id)}">
      <div class="guideline-row__text"><b>${escapeHtml(submission.job.title || 'Untitled')}</b>
      <small>${escapeHtml(submission.sender)} · ${escapeHtml(sentDate(submission.sent))}</small></div>
      <span class="row-meta"><span class="editor-badge">to check</span></span></a>`,
    )
    .join('');
  return `<details class="section-group" data-section="Submitted jobs" open>
    <summary><span class="section-name">Submitted jobs to check</span>
    <span class="section-count">${submissions.length}</span></summary>${rows}</details>`;
}

/** The warnings about details that may identify the patient, found in the text. */
function warningsHtml(warnings) {
  if (!warnings.length) return '';
  const items = warnings.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<div class="warning-message" role="alert">These look like they could identify the
    patient. Reject the job unless they don’t:<ul>${items}</ul></div>`;
}

/**
 * Edit and approve (the new scenario form, filled in from the job), Approve as it is, and
 * Reject, which asks once more as it deletes the photos.
 */
function decisionHtml(id, isConfirmingReject) {
  if (isConfirmingReject) {
    return `${noteHtml('Rejecting deletes the job’s photos and can’t be undone.')}
      <div class="editor-buttons">${jobButton('submission-reject-confirm', 'Yes, reject it', id, 'button')}
      ${jobButton('submission-reject-cancel', 'Cancel', id)}</div>`;
  }
  return `<div class="editor-buttons">${jobButton('submission-edit', 'Edit and approve', id, 'button')}
    ${jobButton('submission-approve', 'Approve as it is', id)}
    ${jobButton('submission-reject', 'Reject', id)}</div>`;
}

/**
 * One submitted job's screen. `view` is { submission, scenario (as learners would see it),
 * warnings, photosLoading, isConfirmingReject }.
 */
export function submissionHtml(viewer, view, signedInButtons) {
  const { submission, scenario } = view;
  const photosNote = view.photosLoading ? noteHtml('Loading the photos…') : '';
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <div class="guideline-header" style="--header-colour:${DEFAULT_HEADER_COLOUR}">
      <h1>${escapeHtml(scenario.title)}</h1>
      <div class="guideline-meta">Submitted job · ${escapeHtml(scenarioTagsText(scenario))}<br>
        Sent by ${escapeHtml(submission.sender)} on ${escapeHtml(sentDate(submission.sent))}</div></div>
    <main class="page-padding">${warningHtml(viewer.message)}
    ${noteHtml(`Check that nothing in the text or photos could identify the patient, and that it reads
      well as a scenario. Edit and approve lets you change anything first, or take a photo out.
      An approved job becomes a new scenario; it reaches the app the next morning.`)}
    ${warningsHtml(view.warnings)}${photosNote}
    <div class="editor-preview scenario-screen">${scenarioBodyHtml(scenario, READ_ONLY)}</div>
    ${decisionHtml(submission.id, view.isConfirmingReject)}</main>`;
}

/** The screen for a job that is no longer waiting (decided by someone else, or a wrong link). */
export function goneSubmissionHtml(viewer, signedInButtons) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}<h1>Job not waiting</h1>
    ${noteHtml('This job was already approved or rejected. Press Refresh for the latest list.')}</main>`;
}
