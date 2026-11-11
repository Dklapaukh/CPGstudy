/*
 * The review queue: guidelines the person chose to study together. Pure logic: takes a queue
 * and returns a new one, touches no page, storage or network. Tested in tests/queue.test.js.
 * A queue is a list of { id, done }. `done` becomes true once the guideline is marked Complete
 * or Review while it is in the queue.
 */
import { MAX_QUEUE_SIZE } from './constants.js';

/** Reads a queue from the text saved in the tracker. Bad or missing text gives an empty queue. */
export function parseQueue(savedText) {
  let parsed;
  try {
    parsed = JSON.parse(savedText);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const queue = [];
  parsed.forEach((item) => {
    const isValid = item && typeof item.id === 'string' && item.id;
    if (isValid && !queue.some((queued) => queued.id === item.id)) {
      queue.push({ id: item.id, done: item.done === true });
    }
  });
  return queue.slice(0, MAX_QUEUE_SIZE);
}

/** The text to save for a queue. */
export function serialiseQueue(queue) {
  return JSON.stringify(queue.map(({ id, done }) => ({ id, done })));
}

/** How many more guidelines the queue has room for. */
export function queueRoom(queue) {
  return Math.max(0, MAX_QUEUE_SIZE - queue.length);
}

/** Adds guidelines that are not queued yet, as many as fit. Returns the new queue. */
export function addToQueue(queue, guidelineIds) {
  const newIds = guidelineIds.filter((id) => !queue.some((queued) => queued.id === id));
  const added = newIds.slice(0, queueRoom(queue)).map((id) => ({ id, done: false }));
  return [...queue, ...added];
}

// Finishing the last guideline empties the queue, so the next one starts fresh.
function emptyWhenFinished(queue) {
  return queue.length > 0 && queue.every((item) => item.done) ? [] : queue;
}

/** Ticks off a queued guideline. Does nothing when it is not queued. */
export function markQueueItemDone(queue, guidelineId) {
  if (!queue.some((item) => item.id === guidelineId)) return queue;
  return emptyWhenFinished(
    queue.map((item) => (item.id === guidelineId ? { ...item, done: true } : item)),
  );
}

/** Takes a guideline out of the queue. */
export function removeFromQueue(queue, guidelineId) {
  return emptyWhenFinished(queue.filter((item) => item.id !== guidelineId));
}

/** Returns { done, total } for the progress text, for example "2 of 5 done". */
export function queueProgress(queue) {
  return {
    done: queue.filter((item) => item.done).length,
    total: queue.length,
  };
}
