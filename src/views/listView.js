/*
 * The guideline list screen: a header (tabs, quiz choice, completion ring, random button,
 * filters and search) above the sections, which are drawn as before.
 * Drawn entirely from the state. Depends on state.js, guidelines.js, logic.js, templates.js.
 */
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
import { updateSyncStatus } from '../sync.js';
import { aiNoticeHtml } from './templates.js';
import { queueButtonHtml } from './queueView.js';
import { quizButtonHtml } from './quizView.js';
import { guidelineQuizButtonHtml } from './guidelineQuizView.js';
import { footerHtml, drawUpdateStatus } from './updateView.js';
import { FILTER, STATUS, MESSAGES } from '../constants.js';

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

/** The header tabs: Home (this screen), Quiz (opens the choice below) and To learn. */
function tabsHtml() {
  return `<nav class="home-tabs" aria-label="Sections of the app">
    <a class="home-tab" href="#" aria-current="page">Home</a>
    <button class="home-tab" id="quiz-tab" type="button" aria-expanded="${quizChoiceOpen}"
      aria-controls="quiz-choice">Quiz</button>
    ${queueButtonHtml()}</nav>
    <div class="quiz-choice" id="quiz-choice"${quizChoiceOpen ? '' : ' hidden'}>
    ${quizButtonHtml()}${guidelineQuizButtonHtml()}</div>`;
}

function addQuizTabListener() {
  app.querySelector('#quiz-tab').addEventListener('click', (event) => {
    quizChoiceOpen = !quizChoiceOpen;
    event.currentTarget.setAttribute('aria-expanded', String(quizChoiceOpen));
    app.querySelector('#quiz-choice').hidden = !quizChoiceOpen;
  });
}

// A standard cog for the Settings button beside Switch tracker.
const COG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

/** The header: tracker name, switch and settings buttons, title, tabs and the progress card. */
function homeHeaderHtml(counts, justClosed) {
  return `<header class="home-header">
    <div class="top-bar"><b class="tracker-label">${escapeHtml(state.label)}</b>
    <div class="top-bar__buttons">
    <button class="switch-button" data-action="switch-tracker">Switch tracker</button>
    <a class="settings-button" href="#settings" aria-label="Settings" title="Settings">${COG_ICON}</a>
    </div></div>
    <h1>Clinical Practice Guidelines</h1>
    <small class="home-header__subtitle">Emergency Ambulance Service · progress and notes are
    shared with everyone who has this passcode<br><span class="sync-status"></span></small>
    ${tabsHtml()}
    <div class="home-card">${progressHtml(counts, guidelines.length, justClosed)}</div>
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
    <div class="guideline-row__text"><b>${escapeHtml(guideline.t)}${updatedTag}</b><small>CPG EAS ${guideline.n}${notesNote}</small></div>${markedDateHtml(guideline.id, status)}</a>`;
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
  app.innerHTML = `${homeHeaderHtml(counts, newlyClosed.has(OVERALL_RING_NAME))}
    <div class="page-padding">${warning}${aiNoticeHtml()}${sectionsHtml(newlyClosed)}${footerHtml()}</div>`;
  app.querySelectorAll('details.section-group').forEach((details) => {
    if (state.openSections[details.dataset.section]) details.open = true;
  });
  addRandomGuidelineButtonListener();
  addQuizTabListener();
  updateSyncStatus();
  drawUpdateStatus();
}
