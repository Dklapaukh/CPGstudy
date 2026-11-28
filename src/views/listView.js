/*
 * The guideline list screen: a header (tabs, quiz choice, completion ring, random button,
 * filters and search) above the sections, which are drawn as before.
 * Drawn entirely from the state. Depends on state.js, guidelines.js, logic.js, templates.js and
 * guidelineQuizState.js (the most recent quiz score on each row).
 */
import { scenariosButtonHtml } from './scenarioView.js';
import { state } from '../state.js';
import { guidelines, sections } from '../guidelines.js';
import {
  countStatuses,
  getStatus,
  guidelineMatches,
  escapeHtml,
  ringArcs,
  suggestionCandidates,
  pickSuggestion,
  markedTime,
  formatUpdatedDate,
} from '../logic.js';
import { aiNoticeHtml, quizIconHtml } from './templates.js';
import { queueButtonHtml } from './queueView.js';
import { quizButtonHtml } from './quizView.js';
import { sortQuizButtonHtml } from './sortQuizView.js';
import { medicineTestButtonHtml } from './medicineTestView.js';
import { guidelineQuizButtonHtml } from './guidelineQuizView.js';
import { footerHtml, drawUpdateStatus } from './updateView.js';
import { lastScore } from '../guidelineQuizState.js';
import { streakButtonHtml } from './streakView.js';
import { isDemoTracker } from '../streakState.js';
import { FILTER, STATUS, MESSAGES, ANONYMISED_JOBS_URL, ADD_JOB_FORM_URL } from '../constants.js';

const app = document.getElementById('app');
const OVERALL_RING_NAME = '\u0000overall'; // cannot clash with a section name

// Rings that were closed the last time the list was drawn, by ring name. A ring plays its
// closing animation only when it was not in this set before; the first drawing never animates.
let closedRingNames = null;
let closedRingsOwner = '';

/**
 * Works out which rings have just closed since the list was last drawn.
 * Takes the names of the rings that are closed now; returns the set of newly closed names.
 * The memory is reset when a different tracker is shown, so switching never plays animations.
 */
function takeNewlyClosedRings(closedNow) {
  const newlyClosed = new Set();
  if (closedRingsOwner === state.passcode && closedRingNames) {
    closedNow.forEach((name) => {
      if (!closedRingNames.has(name)) newlyClosed.add(name);
    });
  }
  closedRingNames = closedNow;
  closedRingsOwner = state.passcode;
  return newlyClosed;
}

/** SVG ring: green arc for Complete, orange arc for Needs review, empty track for the rest. */
function ringHtml(counts, total, sizeClass, justClosed, centreHtml = '') {
  const { completePercent, reviewPercent, isClosed } = ringArcs(counts, total);
  const label = `${counts[STATUS.COMPLETE]} of ${total} complete, ${counts[STATUS.REVIEW]} to review`;
  const closedClass = isClosed ? ' completion-ring--closed' : '';
  const animateClass = justClosed ? ' completion-ring--just-closed' : '';
  const arc = (kind, percent, offset) =>
    percent
      ? `<circle class="completion-ring__arc completion-ring__arc--${kind}" cx="20" cy="20"
          r="16" pathLength="100" stroke-dasharray="${percent} 100"
          stroke-dashoffset="${-offset}"></circle>`
      : '';
  return `<span class="completion-ring ${sizeClass}${closedClass}${animateClass}" role="img"
    aria-label="${label}">
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle class="completion-ring__track" cx="20" cy="20" r="16"></circle>
      ${arc('review', reviewPercent, completePercent)}${arc('complete', completePercent, 0)}
      <path class="completion-ring__tick" d="M12.5 20.5l5 5 10-11" pathLength="100"></path>
    </svg>${centreHtml}</span>`;
}

const SHUFFLE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c2 0 3.2 1
  4.3 2.6l2.4 4.8c1.1 1.6 2.3 2.6 4.3 2.6H21M3 17h3.5c1.6 0 2.7-.7 3.6-1.8M14.6 8.8c.9-1.1
  2-1.8 3.4-1.8H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

/** The ring and its legend, with the round Random guideline button in line on the right. */
function progressHtml(counts, total, justClosed) {
  const percent = Math.round((counts[STATUS.COMPLETE] / total) * 100);
  const centre = `<span class="completion-ring__percent">${percent}%</span>`;
  return `<div class="overall-progress">
    ${ringHtml(counts, total, 'completion-ring--large', justClosed, centre)}
    <div class="progress-legend"><span>${counts[STATUS.COMPLETE]} of ${total} complete</span>
    <span>${counts[STATUS.REVIEW]} to review</span>
    <span>${counts[STATUS.INCOMPLETE]} not done</span></div>
    <button class="random-button" id="random-guideline-button" type="button"
      aria-label="Random guideline" title="Random guideline">${SHUFFLE_ICON}</button></div>`;
}

// Whether the Quiz tab's choice (Medicines or Guideline) is open. Kept here so a redraw after
// a sync does not close it.
let quizChoiceOpen = false;

/** The header tabs: Quiz (opens the choice below the tracker name) and To learn. */
function tabsHtml() {
  return `<nav class="home-tabs" aria-label="Sections of the app">
    <button class="home-tab home-tab--quiz" id="quiz-tab" type="button" aria-expanded="${quizChoiceOpen}"
      aria-controls="quiz-choice">Quiz</button>
    ${queueButtonHtml()}</nav>`;
}

// Anonymised jobs live outside the app (AJ-L): both links open the work pages in a new tab.
const EXTERNAL = 'target="_blank" rel="noopener noreferrer"';

/** The "Anonymised jobs" button (the SharePoint page) and the "Add a job" link (the work form). */
const jobsLinksHtml = () =>
  `<a class="quiz-button" href="${ANONYMISED_JOBS_URL}" ${EXTERNAL}>${quizIconHtml('folder')}<span>Anonymised jobs <span aria-hidden="true">↗</span></span></a>
  <a class="quiz-choice__link" href="${ADD_JOB_FORM_URL}" ${EXTERNAL}>Add a job you went to <span aria-hidden="true">↗</span></a>`;

/** The Quiz tab's choice of quizzes, shown under the tracker name while the tab is open. */
function quizChoiceHtml() {
  return `<div class="quiz-choice" id="quiz-choice"${quizChoiceOpen ? '' : ' hidden'}>
    ${quizButtonHtml()}${guidelineQuizButtonHtml()}${medicineTestButtonHtml()}${sortQuizButtonHtml()}${scenariosButtonHtml()}${jobsLinksHtml()}</div>`;
}

/** Opens and closes the Quiz tab's choice without redrawing the list. */
function addQuizTabListener() {
  app.querySelector('#quiz-tab').addEventListener('click', (event) => {
    quizChoiceOpen = !quizChoiceOpen;
    event.currentTarget.setAttribute('aria-expanded', String(quizChoiceOpen));
    app.querySelector('#quiz-choice').hidden = !quizChoiceOpen;
  });
}

// A standard cog for the Settings button at the right of the top bar.
const COG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

/**
 * The header: one top bar with the Quiz and To learn tabs on the left and the streak and
 * Settings buttons on the right, the tracker name just below it, then the quiz choice, the
 * progress card and the title above the filter pills. Switch tracker lives on Settings.
 */
function homeHeaderHtml(counts, justClosed) {
  return `<header class="home-header">
    <div class="top-bar">${tabsHtml()}
    <div class="top-bar__buttons">${streakButtonHtml()}
    <a class="settings-button" href="#settings" aria-label="Settings" title="Settings">${COG_ICON}</a>
    </div></div>
    <b class="tracker-label">${escapeHtml(state.label)}</b>
    ${quizChoiceHtml()}
    <div class="home-card">${progressHtml(counts, guidelines.length, justClosed)}</div>
    <h1>Clinical Practice Guidelines<br><span class="home-header__edition">Study Version</span></h1>
    ${filtersHtml(counts, guidelines.length)}</header>`;
}

/**
 * Opens a random guideline straight away. The scope is the one open section if exactly one is
 * open, otherwise all guidelines. Filters and search do not limit the choice.
 * The listener is attached here (not in the shared click handler) so this file is self-contained.
 */
function addRandomGuidelineButtonListener() {
  app.querySelector('#random-guideline-button').addEventListener('click', () => {
    const openSectionNames = [...app.querySelectorAll('details.section-group[open]')].map(
      (details) => details.dataset.section,
    );
    const candidates = suggestionCandidates(sections, openSectionNames);
    const suggestion = pickSuggestion(candidates, state.entries, Math.random());
    if (suggestion) location.hash = `#${suggestion.id}`;
  });
}

/** The status filter pills with their counts, and the search box. */
function filtersHtml(counts, total) {
  const filters = [
    [FILTER.ALL, `All (${total})`],
    [FILTER.INCOMPLETE, `Incomplete (${counts[STATUS.INCOMPLETE]})`],
    [FILTER.REVIEW, `Needs review (${counts[STATUS.REVIEW]})`],
    [FILTER.COMPLETE, `Complete (${counts[STATUS.COMPLETE]})`],
  ];
  const chips = filters
    .map(
      ([filter, text]) => `<button class="filter-chip" data-action="set-filter"
        data-filter="${filter}" aria-pressed="${state.filter === filter}">${text}</button>`,
    )
    .join('');
  return `<div class="filter-chips">${chips}</div>
    <input class="text-input" id="search-input" type="search"
      placeholder="Search title or text" value="${escapeHtml(state.searchText)}"
      autocomplete="off">`;
}

/** One guideline row: status dot, title, number and, on the right, score and date. */
function rowHtml(guideline) {
  const status = getStatus(state.entries, guideline.id);
  let dotClass = '';
  if (status === STATUS.COMPLETE) dotClass = ' status-dot--complete';
  if (status === STATUS.REVIEW) dotClass = ' status-dot--review';
  const entry = state.entries[guideline.id];
  const notesNote = entry && entry.n ? ' · has notes' : '';
  const updatedTag = state.updatedGuidelineIds.has(guideline.id)
    ? ` <span class="updated-tag">${MESSAGES.UPDATED_TAG}</span>`
    : '';
  return `<a class="guideline-row" href="#${guideline.id}"><i class="status-dot${dotClass}"></i>
    <div class="guideline-row__text"><b>${escapeHtml(guideline.t)}${updatedTag}</b><small>CPG EAS ${guideline.n}${notesNote}</small></div>${rowMetaHtml(guideline.id, status)}</a>`;
}

/**
 * The right of a row: the most recent guideline quiz score (if played) beside the marked date
 * (if marked). Nothing when there is neither.
 */
function rowMetaHtml(guidelineId, status) {
  const recent = lastScore(guidelineId);
  const score = recent
    ? `<span class="row-quiz-score" title="Most recent guideline quiz score"><span class="visually-hidden">Most recent quiz score </span>${recent.last}%</span>`
    : '';
  const date = markedDateHtml(guidelineId, status);
  return score || date ? `<span class="row-meta">${score}${date}</span>` : '';
}

/**
 * The date a guideline was last marked Review or Complete, at the right of its row, in the
 * status colour. Nothing for an Incomplete guideline.
 */
function markedDateHtml(guidelineId, status) {
  const markedAt = markedTime(state.entries, guidelineId);
  if (!markedAt) return '';
  const kind = status === STATUS.COMPLETE ? 'complete' : 'review';
  const date = formatUpdatedDate(markedAt);
  const day = new Date(markedAt);
  const pad = (number) => String(number).padStart(2, '0');
  const isoDay = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  return `<time class="marked-date marked-date--${kind}" datetime="${isoDay}"
    title="${MESSAGES.MARKED_PREFIX[status]} ${date}"><span class="visually-hidden">${MESSAGES.MARKED_PREFIX[status]} </span>${date}</time>`;
}

/** The folding sections with the guidelines that match the filter and search. */
function sectionsHtml(newlyClosed) {
  const isFiltering = state.filter !== FILTER.ALL || state.searchText.trim();
  let html = '';
  let anyMatch = false;
  sections.forEach((section) => {
    const matching = section.items.filter((guideline) =>
      guidelineMatches(
        guideline,
        getStatus(state.entries, guideline.id),
        state.filter,
        state.searchText,
      ),
    );
    if (!matching.length) return;
    anyMatch = true;
    const sectionCounts = countStatuses(section.items, state.entries);
    const done = sectionCounts[STATUS.COMPLETE];
    html += `<details class="section-group"${isFiltering ? ' open' : ''}
      data-section="${escapeHtml(section.name)}"><summary><span class="section-name">${escapeHtml(section.name)}</span>
      <span class="section-count">${done}/${section.items.length}</span>
      ${ringHtml(sectionCounts, section.items.length, 'completion-ring--small', newlyClosed.has(section.name))}</summary>${matching.map(rowHtml).join('')}
      </details>`;
  });
  return anyMatch ? html : '<p class="empty-message">Nothing matches this filter.</p>';
}

/** Draws the list screen. */
/** On the demo tracker: the Make an account button, and a way in for people with a passcode. */
function demoBannerHtml() {
  if (!isDemoTracker()) return '';
  return `<div class="demo-banner"><p>${MESSAGES.DEMO_BANNER}</p>
    <button class="button" data-action="show-signup">Make an account</button>
    <button class="demo-banner__passcode" type="button" data-action="switch-tracker">
      I already have a passcode</button></div>`;
}

/** Draws the list screen: rings, sections and footer, celebrating any ring just closed. */
export function renderList() {
  const counts = countStatuses(guidelines, state.entries);
  const closedNow = new Set();
  if (ringArcs(counts, guidelines.length).isClosed) closedNow.add(OVERALL_RING_NAME);
  sections.forEach((section) => {
    const sectionCounts = countStatuses(section.items, state.entries);
    if (ringArcs(sectionCounts, section.items.length).isClosed) closedNow.add(section.name);
  });
  const newlyClosed = takeNewlyClosedRings(closedNow);
  const warning = state.storageBlocked
    ? `<div class="warning-message">${MESSAGES.STORAGE_BLOCKED}</div>`
    : '';
  app.innerHTML = `${demoBannerHtml()}${homeHeaderHtml(counts, newlyClosed.has(OVERALL_RING_NAME))}
    <div class="page-padding">${warning}${aiNoticeHtml()}${sectionsHtml(newlyClosed)}${footerHtml()}</div>`;
  app.querySelectorAll('details.section-group').forEach((details) => {
    if (state.openSections[details.dataset.section]) details.open = true;
  });
  addRandomGuidelineButtonListener();
  addQuizTabListener();
  drawUpdateStatus();
}
