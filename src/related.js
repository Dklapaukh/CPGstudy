/*
 * Choosing which related guidelines to show. Pure logic: touches no page, storage or network.
 * Depends on logic.js and constants.js. Tested in tests/queue.test.js.
 */
import { getStatus } from './logic.js';
import { SUGGESTION_WEIGHT, RELATED_LIST_SIZE } from './constants.js';

/**
 * Picks the guidelines to show for one guideline. `links` is its stored list of
 * [relatedId, score, reason], best first. The highest score comes first; when scores are equal,
 * Incomplete comes before Needs review before Complete (the same order as the Random guideline
 * button), then the stored order. Returns at most `limit` items shaped { id, score, reason }.
 */
export function rankRelated(links, entries, limit = RELATED_LIST_SIZE) {
  return links
    .map(([id, score, reason], storedOrder) => ({
      id,
      score,
      reason,
      storedOrder,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        SUGGESTION_WEIGHT[getStatus(entries, b.id)] - SUGGESTION_WEIGHT[getStatus(entries, a.id)] ||
        a.storedOrder - b.storedOrder,
    )
    .slice(0, limit)
    .map(({ id, score, reason }) => ({ id, score, reason }));
}
