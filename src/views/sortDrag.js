/*
 * Dragging the current "Pick the guideline" piece onto a guideline. Works with mouse, touch and
 * pen through pointer events. While dragging, the piece follows the finger and the guideline
 * under it (its name, button or box, all marked data-sort-drop) is highlighted. On release over
 * a guideline the caller is told its side; anywhere else the piece goes back where it was.
 * DOM only. Depends on nothing.
 */

// A press that moves less than this is a tap, not a drag, so nothing is lifted.
const DRAG_START_PX = 6;
// The lifted piece shrinks to this share of its width, so the boxes beside it stay in view.
const LIFTED_SCALE = 0.6;
const TARGET_CLASS = 'sort-drop--target';

/**
 * The side (a number) of the drop target under the point, or null. The lifted piece is under
 * the finger too, but takes no pointer events (.sort-piece--dragging), so it is looked through.
 */
function sideAt(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const target = element && element.closest('[data-sort-drop]');
  return target ? Number(target.dataset.sortDrop) : null;
}

/** Highlights every drop target of `side` (name, button and box) and no others. */
function highlight(side) {
  for (const target of document.querySelectorAll('[data-sort-drop]')) {
    target.classList.toggle(TARGET_CLASS, Number(target.dataset.sortDrop) === side);
  }
}

/**
 * Lifts the piece, shrunk, so it can follow the pointer, leaving a gap of its height. Returns
 * the gap and where the grab point sits inside the shrunk piece.
 */
function liftPiece(piece, grabX, grabY) {
  const box = piece.getBoundingClientRect();
  const placeholder = document.createElement('div');
  placeholder.style.height = `${box.height}px`;
  piece.after(placeholder);
  Object.assign(piece.style, { position: 'fixed', width: `${box.width * LIFTED_SCALE}px` });
  piece.classList.add('sort-piece--dragging');
  const offsetX = (grabX - box.left) * LIFTED_SCALE;
  const offsetY = Math.min(grabY - box.top, piece.getBoundingClientRect().height / 2);
  return { placeholder, offsetX, offsetY };
}

/**
 * Starts watching a press on the current piece (`event` is a pointerdown on it). Once it moves
 * far enough the piece is lifted and follows; `onDrop(side)` is called on release over a guideline.
 */
export function startPieceDrag(event, onDrop) {
  const piece = event.target.closest('[data-sort-drag]');
  if (!piece || event.button > 0) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  let lifted = null;

  const onMove = (moveEvent) => {
    moveEvent.preventDefault();
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (!lifted && Math.hypot(dx, dy) < DRAG_START_PX) return;
    if (!lifted) lifted = liftPiece(piece, startX, startY);
    piece.style.left = `${moveEvent.clientX - lifted.offsetX}px`;
    piece.style.top = `${moveEvent.clientY - lifted.offsetY}px`;
    highlight(sideAt(moveEvent.clientX, moveEvent.clientY));
  };
  const finish = (upEvent, dropped) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (!lifted) return;
    const side = dropped ? sideAt(upEvent.clientX, upEvent.clientY) : null;
    highlight(null);
    lifted.placeholder.remove();
    piece.removeAttribute('style');
    piece.classList.remove('sort-piece--dragging');
    if (side !== null) onDrop(side);
  };
  const onUp = (upEvent) => finish(upEvent, true);
  const onCancel = (cancelEvent) => finish(cancelEvent, false);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}
