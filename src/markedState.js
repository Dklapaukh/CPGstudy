/*
 * Saving when a guideline was last marked Review or Complete. Stored as one extra entry per
 * guideline (MARKED_ENTRY_PREFIX + guideline id, status always Incomplete, note = the time in
 * milliseconds), so it is saved, uploaded and merged by the same code as the guidelines and needs
 * no backend change. Only pressing Review or Complete calls this: opening a guideline or editing
 * its notes leaves the date alone.
 * Depends on state.js, sync.js and logic.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { nextTimestamp } from './logic.js';
import { MARKED_ENTRY_PREFIX, STATUS } from './constants.js';

/** Records that the guideline was marked just now (`markedAt`, in milliseconds). */
export function saveMarkedTime(guidelineId, markedAt) {
  const entryId = MARKED_ENTRY_PREFIX + guidelineId;
  const previous = state.entries[entryId];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: String(markedAt),
    t: nextTimestamp(previous ? previous.t : 0, Date.now()),
  };
  state.entries[entryId] = entry;
  state.pendingChanges[entryId] = { ...entry };
  saveSession();
  scheduleSync();
}
