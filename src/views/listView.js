/*
 * The guideline list screen: progress bar, filters, search and sections.
 * Drawn entirely from the state. Depends on state.js, guidelines.js, logic.js, templates.js.
 */
import { state } from '../state.js';
import { guidelines, sections } from '../guidelines.js';
import { countStatuses, getStatus, guidelineMatches, escapeHtml } from '../logic.js';
import { updateSyncStatus } from '../sync.js';
import { coverHtml } from './templates.js';
import { FILTER, STATUS, MESSAGES } from '../constants.js';

const app = document.getElementById('app');

function progressHtml(counts, total) {
  const share = (count) => `${(count / total) * 100}%`;
  return `<div class="progress-bar" aria-hidden="true">
    <i class="progress-bar__segment progress-bar__segment--complete"
      style="--share:${share(counts[STATUS.COMPLETE])}"></i>
    <i class="progress-bar__segment progress-bar__segment--review"
      style="--share:${share(counts[STATUS.REVIEW])}"></i>
  </div>
  <div class="progress-legend"><span>${counts[STATUS.COMPLETE]} of ${total} complete</span>
    <span>${counts[STATUS.REVIEW]} to review</span>
    <span>${counts[STATUS.INCOMPLETE]} not done</span></div>`;
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
  return `<a class="guideline-row" href="#${guideline.id}"><i class="status-dot${dotClass}"></i>
    <div><b>${escapeHtml(guideline.t)}</b><small>CPG EAS ${guideline.n}${notesNote}</small></div></a>`;
}

function sectionsHtml() {
  const isFiltering = state.filter !== FILTER.ALL || state.searchText;
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
    const done = section.items.filter(
      (guideline) => getStatus(state.entries, guideline.id) === STATUS.COMPLETE,
    ).length;
    html += `<details class="section-group"${isFiltering ? ' open' : ''}
      data-section="${escapeHtml(section.name)}"><summary>${escapeHtml(section.name)}
      <span>${done}/${section.items.length}</span></summary>${matching.map(rowHtml).join('')}
      </details>`;
  });
  return anyMatch ? html : '<p class="empty-message">Nothing matches this filter.</p>';
}

/** Draws the list screen. */
export function renderList() {
  const counts = countStatuses(guidelines, state.entries);
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
  })}<div class="page-padding">${warning}${progressHtml(counts, guidelines.length)}
    ${filtersHtml(counts, guidelines.length)}${sectionsHtml()}</div>`;
  app.querySelectorAll('details.section-group').forEach((details) => {
    if (state.openSections[details.dataset.section]) details.open = true;
  });
  updateSyncStatus();
}
