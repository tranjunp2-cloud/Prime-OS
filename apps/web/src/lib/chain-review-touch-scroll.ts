/** Hand a vertical touch gesture at a matrix edge to its review, never the page behind it. */
export function chainReviewTouchScroll(matrix: HTMLElement, review: HTMLElement) {
  let previous: { x: number; y: number } | null = null;
  let origin: { x: number; y: number } | null = null;
  const reset = () => { previous = null; origin = null; };
  const start = (event: TouchEvent) => {
    reset();
    if (event.touches.length !== 1 || !(event.target instanceof Element)
      || event.target.closest('input, textarea, select, fieldset, [contenteditable="true"], [role="slider"]')) return;
    const point = event.touches[0];
    previous = origin = { x: point.clientX, y: point.clientY };
  };
  const move = (event: TouchEvent) => {
    if (!previous || !origin || event.touches.length !== 1) { reset(); return; }
    const point = event.touches[0];
    const delta = previous.y - point.clientY;
    const travelX = Math.abs(point.clientX - origin.x), travelY = Math.abs(point.clientY - origin.y);
    previous = { x: point.clientX, y: point.clientY };
    // Leave taps, horizontal swipes, pinch/zoom and an already claimed native gesture alone.
    if (!event.cancelable || event.defaultPrevented || travelY < 10 || travelY <= travelX || !delta) return;
    const atEdge = delta < 0 ? matrix.scrollTop <= 1 : matrix.scrollTop >= matrix.scrollHeight - matrix.clientHeight - 1;
    if (!atEdge) return;
    const before = review.scrollTop;
    const next = Math.max(0, Math.min(review.scrollHeight - review.clientHeight, before + delta));
    if (next === before) return;
    // Avoid double movement: only replace native handling while forwarding to the review.
    event.preventDefault();
    review.scrollTop = next;
  };
  matrix.addEventListener('touchstart', start, { passive: true });
  matrix.addEventListener('touchmove', move, { passive: false });
  matrix.addEventListener('touchend', reset, { passive: true });
  matrix.addEventListener('touchcancel', reset, { passive: true });
  return () => {
    matrix.removeEventListener('touchstart', start);
    matrix.removeEventListener('touchmove', move);
    matrix.removeEventListener('touchend', reset);
    matrix.removeEventListener('touchcancel', reset);
  };
}
