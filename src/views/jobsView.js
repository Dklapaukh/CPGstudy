/*
 * Anonymised jobs (Quiz > Anonymised jobs, docs/anonymised-jobs.md): the list (#jobs), newest
 * first with a theme dropdown and the Add a job link at the top, and one job (#job-<id>): the
 * job as sent, its lessons learnt and links to any recordings. Mentors use them as ideas for
 * scenarios; nothing is run or saved here.
 * The jobs come from content/anonymised-jobs.js (approved on the editor page, copied daily).
 * Depends on state.js, logic.js, guidelines.js, constants.js, anonymisedJobs.js,
 * scenarioLogic.js, scenarioMarkup.js and templates.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import { anonymisedJobs } from '../../content/anonymised-jobs.js';
import { liveJobs, filterJobs } from '../anonymisedJobs.js';
import { themesInUse } from '../scenarioLogic.js';
import { JOBS_HASH, JOB_HASH_PREFIX, SUBMIT_PAGE } from '../constants.js';
import { jobBodyHtml, scenarioTagsText } from './scenarioMarkup.js';
import { quizIconHtml } from './templates.js';

const app = document.getElementById('app');
const shownJobs = liveJobs(anonymisedJobs);
const sectionOf = (guidelineId) => guidelineById(guidelineId)?.sec;

/** The job named by an address like "job-mabc-x1y2" (a job's id is its address), or undefined. */
export const jobFromHash = (hash) =>
  hash.startsWith(JOB_HASH_PREFIX) ? shownJobs.find((job) => job.id === hash) : undefined;

/** The "Anonymised jobs" button for the Quiz choice on the list screen. */
export const jobsButtonHtml = () =>
  `<a class="quiz-button" href="#${JOBS_HASH}">${quizIconHtml('folder')}<span>Anonymised jobs</span></a>`;

/** "26 Nov 2026" from "2026-11-26". */
const dateText = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** The theme dropdown, offering only themes some job has; '' when none has one. */
function themeChoiceHtml(chosen) {
  const themes = themesInUse(shownJobs, sectionOf);
  if (!themes.length) return '';
  const options = ['<option value="">All themes</option>']
    .concat(
      themes.map(
        (name) =>
          `<option value="${escapeHtml(name)}"${chosen === name ? ' selected' : ''}>${escapeHtml(name)}</option>`,
      ),
    )
    .join('');
  return `<label class="quiz-setting scenario-theme-setting">Theme
    <select id="job-theme-choice">${options}</select></label>`;
}

/** One row of the list: title, then suburb, presentation and the date it was added. */
const rowHtml = (job) => `<a class="scenario-row" href="#${escapeHtml(job.id)}">
    <span class="scenario-row__text"><b>${escapeHtml(job.title)}</b>
    <small>${escapeHtml(job.suburb)} · ${escapeHtml(scenarioTagsText(job))}</small>
    <small>Added ${escapeHtml(dateText(job.approved))}</small></span><span aria-hidden="true">›</span></a>`;

/** What the list shows when nothing matches, or when no job has been approved yet. */
const emptyHtml = () =>
  shownJobs.length
    ? '<p class="empty-message">No job has this theme yet.</p>'
    : '<p class="empty-message">No jobs yet. Send the first one.</p>';

/** Draws the list of jobs with the chosen theme, newest first. */
export function renderJobList() {
  const shown = filterJobs(shownJobs, state.jobTheme, sectionOf);
  const rows = shown.length
    ? `<section class="scenario-card">${shown.map(rowHtml).join('')}</section>`
    : emptyHtml();
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding scenario-screen jobs-screen"><h1 class="quiz-title">Anonymised jobs</h1>
    <p class="scenario-intro">Interesting jobs staff went to, anonymised.<br>
    Can be used as ideas for scenarios.</p>
    <a class="scenario-queue-button scenario-submit-link" href="${SUBMIT_PAGE}">Add a job you went
    to</a>${themeChoiceHtml(state.jobTheme)}${rows}</div>`;
}

/** Draws one job. */
export function renderJob(job) {
  app.innerHTML = `<a class="back-link" href="#${JOBS_HASH}">‹ Anonymised jobs</a>
    <div class="page-padding scenario-screen jobs-screen">${jobBodyHtml(job, dateText(job.approved))}</div>`;
}
