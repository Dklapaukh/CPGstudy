/*
 * Pure logic: takes input and returns a result, touches no page, storage or network.
 * Depends on constants.js only. Tested in tests/logic.test.js.
 */
import { BLOCK, STATUS, FILTER, SUGGESTION_WEIGHT, MARKED_ENTRY_PREFIX } from './constants.js';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Makes text safe to put inside page markup. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

/** Flattens the sections into one list, each guideline remembering its section name (`sec`). */
export function flattenGuidelines(guidelineData) {
  const guidelines = [];
  guidelineData.sections.forEach((section) => {
    section.items.forEach((guideline) => {
      guideline.sec = section.name;
      guidelines.push(guideline);
    });
  });
  return guidelines;
}

/** Status code of a guideline; anything not yet recorded counts as incomplete. */
export function getStatus(entries, guidelineId) {
  return (entries[guidelineId] && entries[guidelineId].s) || STATUS.INCOMPLETE;
}

/** Returns how many guidelines are in each status, keyed by status code. */
export function countStatuses(guidelines, entries) {
  const counts = { [STATUS.INCOMPLETE]: 0, [STATUS.REVIEW]: 0, [STATUS.COMPLETE]: 0 };
  guidelines.forEach((guideline) => {
    counts[getStatus(entries, guideline.id)]++;
  });
  return counts;
}

/**
 * Sizes of the two coloured arcs of a completion ring, as percentages (0 to 100) of the circle.
 * Takes the status counts and the total; returns { completePercent, reviewPercent, isClosed }.
 * `isClosed` is true only when every guideline is Complete (an empty group is never closed).
 */
export function ringArcs(counts, total) {
  if (!total) return { completePercent: 0, reviewPercent: 0, isClosed: false };
  return {
    completePercent: (counts[STATUS.COMPLETE] / total) * 100,
    reviewPercent: (counts[STATUS.REVIEW] / total) * 100,
    isClosed: counts[STATUS.COMPLETE] === total,
  };
}

/** The strings of text inside one content block (see BLOCK in constants.js for the kinds). */
function blockTexts(block) {
  const [kind] = block;
  if (kind === BLOCK.BOX) return block[1].flatMap(blockTexts);
  if (kind === BLOCK.TABLE) {
    return block[1]
      .flat()
      .filter(Boolean)
      .map((cell) => cell.t);
  }
  if (kind === BLOCK.KEY) return [block[1], block[2]];
  return [block[1]];
}

/**
 * The body of a guideline as plain lower-case text for searching: the words a person sees, with
 * the markup removed, so that "b" or "tbl" no longer matches every guideline and a phrase is
 * found even when part of it is bold.
 */
export function guidelineSearchText(guideline) {
  return guideline.b
    .flatMap(blockTexts)
    .join(' ')
    .replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Making the search text is slow, so it is made once for each guideline, when first needed.
const searchTextCache = new WeakMap();

function getSearchText(guideline) {
  if (!searchTextCache.has(guideline)) {
    searchTextCache.set(guideline, guidelineSearchText(guideline));
  }
  return searchTextCache.get(guideline);
}

/** True when the guideline passes the status filter and the search text (as typed). */
export function guidelineMatches(guideline, status, filter, searchText) {
  if (filter === FILTER.INCOMPLETE && status !== STATUS.INCOMPLETE) return false;
  if (filter === FILTER.REVIEW && status !== STATUS.REVIEW) return false;
  if (filter === FILTER.COMPLETE && status !== STATUS.COMPLETE) return false;
  const wanted = searchText.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!wanted) return true;
  const heading = `${guideline.n} ${guideline.t} ${guideline.sec}`.toLowerCase();
  return heading.includes(wanted) || getSearchText(guideline).includes(wanted);
}

/**
 * Merges entries from the server into the local ones. The entry with the newest `t` wins.
 * Returns { entries, changed }; `changed` is true only when status or note differ,
 * so the screen is redrawn only when something visible changed.
 */
export function mergeRemoteEntries(localEntries, remoteEntries) {
  const entries = { ...localEntries };
  let changed = false;
  Object.keys(remoteEntries).forEach((id) => {
    const remote = remoteEntries[id];
    const local = entries[id];
    if (local && (remote.t || 0) <= (local.t || 0)) return;
    if (!local || local.s !== remote.s || local.n !== remote.n) changed = true;
    entries[id] = { s: remote.s || STATUS.INCOMPLETE, n: remote.n || '', t: remote.t || 0 };
  });
  return { entries, changed };
}

/** Time to stamp on an edit. Always later than the previous edit, so two fast edits keep order. */
export function nextTimestamp(previousTimestamp, now) {
  return previousTimestamp >= now ? previousTimestamp + 1 : now;
}

/** Date as shown under the notes box, for example "5 Nov 2026". */
export function formatUpdatedDate(milliseconds) {
  return new Date(milliseconds).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * When a guideline was last marked Review or Complete, in milliseconds, or 0 when it is
 * Incomplete. Uses the guideline's marked entry; a guideline marked before that entry existed
 * falls back to the time of its last edit.
 */
export function markedTime(entries, guidelineId) {
  if (getStatus(entries, guidelineId) === STATUS.INCOMPLETE) return 0;
  const marked = entries[MARKED_ENTRY_PREFIX + guidelineId];
  const markedAt = marked ? Number(marked.n) : 0;
  if (markedAt > 0) return markedAt;
  return entries[guidelineId].t || 0;
}

/** A mailto: link with the subject and body filled in, or '' when there is no address. */
export function feedbackMailto(address, subject, body) {
  if (!address) return '';
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${address}?${query}`;
}

/** Text of the small save indicator. */
export function syncStatusText({ lastSyncFailed, isOnline, pendingCount }) {
  if (lastSyncFailed || !isOnline) return 'Waiting for signal';
  return pendingCount > 0 ? 'Saving…' : 'Saved';
}

/**
 * Picks the guidelines a random suggestion may come from: the one open section when exactly
 * one section is open, otherwise every guideline. Takes the sections and the names of the
 * sections that are open; returns a list of guidelines.
 */
export function suggestionCandidates(sections, openSectionNames) {
  const openSections = sections.filter((section) => openSectionNames.includes(section.name));
  const chosenSections = openSections.length === 1 ? openSections : sections;
  return chosenSections.flatMap((section) => section.items);
}

/**
 * Picks one guideline at random, favouring Incomplete, then Needs review, then Complete
 * (weights in SUGGESTION_WEIGHT). `randomNumber` is a number from 0 up to but not including 1;
 * it is passed in so tests can control it. Returns undefined when there are no guidelines.
 */
export function pickSuggestion(candidates, entries, randomNumber) {
  const weights = candidates.map(
    (guideline) => SUGGESTION_WEIGHT[getStatus(entries, guideline.id)],
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = randomNumber * totalWeight;
  for (let index = 0; index < candidates.length; index++) {
    remaining -= weights[index];
    if (remaining < 0) return candidates[index];
  }
  return candidates[candidates.length - 1];
}
