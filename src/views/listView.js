/*
 * The guideline list screen: completion rings, filters, search and sections.
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
} from '../logic.js';
import { updateSyncStatus } from '../sync.js';
import { coverHtml } from './templates.js';
import { queueButtonHtml } from './queueView.js';
import { quizButtonHtml } from './quizView.js';
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

function progressHtml(counts, total, justClosed) {
  const percent = Math.round((counts[STATUS.COMPLETE] / total) * 100);
  const centre = `<span class="completion-ring__percent">${percent}%</span>`;
  return `<div class="overall-progress">
    ${ringHtml(counts, total, 'completion-ring--large', justClosed, centre)}
    <div class="progress-legend"><span>${counts[STATUS.COMPLETE]} of ${total} complete</span>
    <span>${counts[STATUS.REVIEW]} to review</span>
    <span>${counts[STATUS.INCOMPLETE]} not done</span></div></div>`;
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
    <div><b>${escapeHtml(guideline.t)}${updatedTag}</b><small>CPG EAS ${guideline.n}${notesNote}</small></div></a>`;
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
  app.innerHTML = `${coverHtml({
    labelHtml: escapeHtml(state.label),
    buttonHtml:
      '<button class="switch-button" data-action="switch-tracker">Switch tracker</button>',
    subtitleHtml:
      'Mentoring tracker · progress and notes are shared with everyone who has this passcode' +
      '<br><span class="sync-status"></span>',
  })}<div class="page-padding">${warning}${progressHtml(counts, guidelines.length, newlyClosed.has(OVERALL_RING_NAME))}
    <button class="random-button" id="random-guideline-button" type="button">
      Random guideline</button>
    ${quizButtonHtml()}
    ${queueButtonHtml()}
    ${filtersHtml(counts, guidelines.length)}${sectionsHtml(newlyClosed)}${footerHtml()}</div>`;
  app.querySelectorAll('details.section-group').forEach((details) => {
    if (state.openSections[details.dataset.section]) details.open = true;
  });
  addRandomGuidelineButtonListener();
  updateSyncStatus();
  drawUpdateStatus();
}
