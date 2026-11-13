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

/**
 * Starts dragging the card whose grip got `event` (a pointerdown). `onDrop(cardIndex, listName,
 * position)` is called on release with the list's data-drop-list name.
 */
export function startCardDrag(event, onDrop) {
  const grip = event.target.closest('.order-grip');
  const card = grip && grip.closest('.order-card');
  if (!card || event.button > 0) return;
  event.preventDefault();
  const lists = [...document.querySelectorAll('[data-drop-list]')];
  const box = card.getBoundingClientRect();
  const offsetY = event.clientY - box.top;
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
  let lastY = event.clientY;
  let scrollTimer = null;

  const placeGap = (clientY) => {
    const list = listAt(lists, clientY);
    const others = [...list.querySelectorAll('.order-card')].filter((other) => other !== card);
    const before = others.find((other) => {
      const otherBox = other.getBoundingClientRect();
      return clientY < otherBox.top + otherBox.height / 2;
    });
    if (before) list.insertBefore(gap, before);
    else list.appendChild(gap);
  };
  const follow = (clientY) => {
    lastY = clientY;
    card.style.top = `${clientY - offsetY}px`;
    placeGap(clientY);
  };
  const scrollStep = () => {
    if (lastY < EDGE_PX) window.scrollBy(0, -SCROLL_STEP_PX);
    else if (lastY > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_STEP_PX);
    else return;
    placeGap(lastY);
  };
  const onMove = (moveEvent) => {
    moveEvent.preventDefault();
    follow(moveEvent.clientY);
  };
  const finish = (dropped) => {
    clearInterval(scrollTimer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    const list = gap.parentElement;
    const position = [...list.children]
      .filter((child) => child !== card)
      .filter((child) => child === gap || child.classList.contains('order-card'))
      .indexOf(gap);
    gap.remove();
    card.removeAttribute('style');
    card.classList.remove('order-card--dragging');
    if (dropped) onDrop(Number(card.dataset.card), list.dataset.dropList, position);
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  scrollTimer = setInterval(scrollStep, SCROLL_EVERY_MS);
}
