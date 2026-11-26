/*
 * Editor page: markup for approved anonymised jobs (docs/anonymised-jobs.md). The list is one
 * folding section on the first screen; one job (#aj-<id>) is drawn as learners see it, then a
 * card to change its Lessons learnt and its Recordings and links, and to remove it from the app.
 * Each function takes prepared data and returns text; main.js handles the clicks.
 * Depends on logic.js, staffPage.js, anonymisedJobs.js and views/scenarioMarkup.js.
 */
import { escapeHtml } from '../logic.js';
import { warningHtml, noteHtml, actionButtonHtml } from '../staffPage.js';
import { MAX_LESSONS, MAX_LINKS } from '../anonymisedJobs.js';
import { jobBodyHtml, scenarioTagsText } from '../views/scenarioMarkup.js';

export const APPROVED_JOB_HASH_PREFIX = '#aj-';

/**
 * The first screen's Anonymised jobs section: `rows` as the jobs, newest first, each with
 * `isPublished`. Nothing when no job has been approved.
 */
export function jobsSectionHtml(rows, isOpen) {
  if (!rows.length) return '';
  const items = rows
    .map(
      (job) => `<a class="guideline-row" href="${APPROVED_JOB_HASH_PREFIX}${escapeHtml(job.id)}">
      <div class="guideline-row__text"><b>${escapeHtml(job.title)}</b>
      <small>${escapeHtml(scenarioTagsText(job))} · added ${escapeHtml(job.approved)} · ${
        job.lessons.length
      } lessons · ${job.links.length} links</small></div>
      ${job.isPublished ? '' : '<span class="row-meta"><span class="editor-badge">not in the app yet</span></span>'}</a>`,
    )
    .join('');
  return `<details class="section-group" data-section="Anonymised jobs"${isOpen ? ' open' : ''}>
    <summary><span class="section-name">Anonymised jobs</span>
    <span class="section-count">${rows.length}</span></summary>${items}</details>`;
}

const LESSONS_HINT = `One lesson per line, at most ${MAX_LESSONS}. They start as what the sender
  said it could teach and its debrief points.`;
const LINKS_HINT = `One per line, at most ${MAX_LINKS}: a title, a bar, then the address, such as
  “Teaching session, 3 Dec | https://…”. Only https addresses. The app is public, so share the
  recording itself only with the people who should see it.`;

/** The buttons under the card: Save, and Remove, which asks once more. */
function cardButtonsHtml(isConfirmingRemove) {
  if (isConfirmingRemove) {
    return `${noteHtml('Removing takes the job out of the app for good; it can’t be undone.')}
      <div class="editor-buttons">${actionButtonHtml('job-remove-yes', 'Yes, remove it', '', 'button')}
      ${actionButtonHtml('job-remove-no', 'Cancel')}</div>`;
  }
  return `<div class="editor-buttons">${actionButtonHtml('job-save', 'Save', '', 'button')}
    ${actionButtonHtml('job-remove', 'Remove from the app')}</div>`;
}

/**
 * One approved job's screen. `view` is { job (with approved, lessons, links), dateText,
 * lessonsText, linksText, error, isConfirmingRemove, isPublished }.
 */
export function approvedJobHtml(viewer, view, signedInButtons) {
  const publishNote = view.isPublished
    ? ''
    : noteHtml('Not in the app yet: saved changes reach it the next morning.');
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}${publishNote}
    <div class="editor-preview scenario-screen">${jobBodyHtml(view.job, view.dateText, true)}</div>
    <section class="scenario-card review-card"><h2>Lessons and links</h2>
    <label class="editor-label" for="job-lessons">Lessons learnt</label>
    <textarea class="text-input editor-box" id="job-lessons" rows="6">${escapeHtml(view.lessonsText)}</textarea>
    ${noteHtml(LESSONS_HINT)}
    <label class="editor-label" for="job-links">Recordings and links</label>
    <textarea class="text-input editor-box" id="job-links" rows="3">${escapeHtml(view.linksText)}</textarea>
    ${noteHtml(LINKS_HINT)}${warningHtml(view.error)}
    ${cardButtonsHtml(view.isConfirmingRemove)}</section></main>`;
}

/** The screen for a job that is not among the approved ones (removed, or a wrong link). */
export function goneJobHtml(viewer, signedInButtons) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}<h1>Job not found</h1>
    ${noteHtml('This job was removed, or the link is wrong. Press Refresh for the latest list.')}</main>`;
}
