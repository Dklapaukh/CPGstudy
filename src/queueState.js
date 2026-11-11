/*
 * Reading and saving the review queue in the state. The queue is stored as one extra entry
 * (QUEUE_ENTRY_ID) so it is saved, uploaded and merged by the same code as the guidelines,
 * works offline, and is shared by everyone with the tracker passcode.
 * Depends on state.js, sync.js, logic.js and queue.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { nextTimestamp } from './logic.js';
import { parseQueue, serialiseQueue, markQueueItemDone } from './queue.js';
import { QUEUE_ENTRY_ID, STATUS } from './constants.js';

/** The current queue. */
export function getQueue() {
  const entry = state.entries[QUEUE_ENTRY_ID];
  return entry ? parseQueue(entry.n) : [];
}

/** Saves a new queue on the phone and queues it for upload. */
export function saveQueue(queue) {
  const previous = state.entries[QUEUE_ENTRY_ID];
  const timestamp = nextTimestamp(previous ? previous.t : 0, Date.now());
  const entry = {
    s: STATUS.INCOMPLETE,
    n: serialiseQueue(queue),
    t: timestamp,
  };
  state.entries[QUEUE_ENTRY_ID] = entry;
  state.pendingChanges[QUEUE_ENTRY_ID] = { ...entry };
  saveSession();
  scheduleSync();
}

/** Ticks off a guideline that was just marked Complete or Review, if it is in the queue. */
export function tickOffQueuedGuideline(guidelineId) {
  const queue = getQueue();
  const updated = markQueueItemDone(queue, guidelineId);
  if (updated !== queue) saveQueue(updated);
}
