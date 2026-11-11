/*
 * Pure logic: takes input and returns a result, touches no page, storage or network.
 * Depends on constants.js only. Tested in tests/logic.test.js.
 */
import { STATUS, FILTER } from './constants.js';

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

// Searching the body text is slow, so the lower-case text of each guideline is made once.
const bodyTextCache = new WeakMap();

function getBodyText(guideline) {
  if (!bodyTextCache.has(guideline)) {
    bodyTextCache.set(guideline, JSON.stringify(guideline.b).toLowerCase());
  }
  return bodyTextCache.get(guideline);
}

/** True when the guideline passes the status filter and the (lower-case) search text. */
export function guidelineMatches(guideline, status, filter, searchText) {
  if (filter === FILTER.INCOMPLETE && status !== STATUS.INCOMPLETE) return false;
  if (filter === FILTER.REVIEW && status !== STATUS.REVIEW) return false;
  if (filter === FILTER.COMPLETE && status !== STATUS.COMPLETE) return false;
  if (!searchText) return true;
  const heading = `${guideline.n} ${guideline.t} ${guideline.sec}`.toLowerCase();
  return heading.includes(searchText) || getBodyText(guideline).includes(searchText);
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

/** Text of the small save indicator. */
export function syncStatusText({ lastSyncFailed, isOnline, pendingCount }) {
  if (lastSyncFailed || !isOnline) return 'Waiting for signal';
  return pendingCount > 0 ? 'Saving…' : 'Saved';
}
