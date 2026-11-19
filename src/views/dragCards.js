/*
 * Dragging a quiz card to a new place (guideline quiz ordering rounds). Works with mouse, touch
 * and pen through pointer events; only the card's grip starts a drag, so the page still scrolls
 * normally when the student swipes over a card. While dragging, the card follows the finger and a
 * gap shows where it will land, in "Your order" or "Not in this guideline". On release the caller
 * is told the card, the list and the position, and redraws the screen from the state.
 * DOM only. Depends on nothing.
 */

// Near the top or bottom edge of the window the page scrolls, so a long list can be crossed.
const EDGE_PX = 60;
const SCROLL_STEP_PX = 12;
const SCROLL_EVERY_MS = 16;

/** The list under the pointer: the one containing it, else the nearest by height. */
function listAt(lists, clientY) {
  let nearest = lists[0];
  let nearestDistance = Infinity;
  for (const list of lists) {
    const box = list.getBoundingClientRect();
    if (clientY >= box.top && clientY <= box.bottom) return list;
    const distance = Math.min(Math.abs(clientY - box.top), Math.abs(clientY - box.bottom));
    if (distance < nearestDistance) {
      nearest = list;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Moves the gap to where a card dropped at `clientY` would go, in the list under it. */
function placeGap(lists, card, gap, clientY) {
  const list = listAt(lists, clientY);
  const others = [...list.querySelectorAll('.order-card')].filter((other) => other !== card);
  const before = others.find((other) => {
    const otherBox = other.getBoundingClientRect();
    return clientY < otherBox.top + otherBox.height / 2;
  });
  if (before) list.insertBefore(gap, before);
  else list.appendChild(gap);
}

/** The gap's place among the cards of its list, not counting the dragged card. */
function gapPosition(gap, card) {
  return [...gap.parentElement.children]
    .filter((child) => child !== card)
    .filter((child) => child === gap || child.classList.contains('order-card'))
    .indexOf(gap);
}

/** Lifts the card out of its list where it is on screen, leaving a gap of its height. */
function liftCard(card, box) {
  const gap = document.createElement('li');
  gap.className = 'order-gap';
  gap.style.height = `${box.height}px`;
  card.after(gap);
  Object.assign(card.style, {
    position: 'fixed',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
  });
  card.classList.add('order-card--dragging');
  return gap;
}

/** Moves the lifted card with the pointer and the gap to where it would land. */
function followPointer(drag, clientY) {
  drag.lastY = clientY;
  drag.card.style.top = `${clientY - drag.offsetY}px`;
  placeGap(drag.lists, drag.card, drag.gap, clientY);
}

/** One tick of edge scrolling: near the window's top or bottom the page moves, and the gap too. */
function scrollNearEdge(drag) {
  if (drag.lastY < EDGE_PX) window.scrollBy(0, -SCROLL_STEP_PX);
  else if (drag.lastY > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_STEP_PX);
  else return;
  placeGap(drag.lists, drag.card, drag.gap, drag.lastY);
}

/** Puts the card back as it was; if `dropped`, tells `onDrop` the card, list and position. */
function dropCard(drag, dropped, onDrop) {
  const { card, gap } = drag;
  const list = gap.parentElement;
  const position = gapPosition(gap, card);
  gap.remove();
  card.removeAttribute('style');
  card.classList.remove('order-card--dragging');
  if (dropped) onDrop(Number(card.dataset.card), list.dataset.dropList, position);
}

/** Follows the pointer until it is released (a drop) or cancelled, then stops listening. */
function followUntilRelease(drag, onDrop) {
  const onMove = (moveEvent) => {
    moveEvent.preventDefault();
    followPointer(drag, moveEvent.clientY);
  };
  const finish = (dropped) => {
    clearInterval(drag.scrollTimer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    dropCard(drag, dropped, onDrop);
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  drag.scrollTimer = setInterval(() => scrollNearEdge(drag), SCROLL_EVERY_MS);
}

/**
 * Starts dragging the card whose grip got `event` (a pointerdown). `onDrop(cardIndex, listName,
 * position)` is called on release with the list's data-drop-list name.
 */
export function startCardDrag(event, onDrop) {
  const grip = event.target.closest('.order-grip');
  const card = grip && grip.closest('.order-card');
  if (!card || event.button > 0) return;
  event.preventDefault();
  const box = card.getBoundingClientRect();
  const drag = {
    card,
    lists: [...document.querySelectorAll('[data-drop-list]')],
    offsetY: event.clientY - box.top,
    gap: liftCard(card, box),
    lastY: event.clientY,
    scrollTimer: null,
  };
  followUntilRelease(drag, onDrop);
}
