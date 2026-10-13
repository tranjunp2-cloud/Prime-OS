// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chainReviewTouchScroll } from './chain-review-touch-scroll';

let matrix: HTMLDivElement, review: HTMLDivElement, dispose: () => void;
const touch = (type: string, x: number, y: number, options: { target?: HTMLElement; cancelable?: boolean; count?: number } = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: options.cancelable ?? true });
  Object.defineProperty(event, 'touches', { value: Array.from({ length: options.count ?? 1 }, () => ({ clientX: x, clientY: y })) });
  (options.target ?? matrix).dispatchEvent(event);
  return event;
};
beforeEach(() => {
  review = document.createElement('div'); matrix = document.createElement('div');
  review.append(matrix); document.body.append(review);
  Object.defineProperties(matrix, { scrollHeight: { value: 1000 }, clientHeight: { value: 400 } });
  Object.defineProperties(review, { scrollHeight: { value: 1600 }, clientHeight: { value: 700 } });
  review.scrollTop = 300;
  dispose = chainReviewTouchScroll(matrix, review);
});
afterEach(() => { dispose(); review.remove(); });

describe('Touch chaining within listing review', () => {
  it('forwards a swipe up at the table bottom to the review', () => {
    matrix.scrollTop = 600;
    touch('touchstart', 100, 200);
    expect(touch('touchmove', 100, 150).defaultPrevented).toBe(true);
    expect(review.scrollTop).toBe(350);
    expect(matrix.scrollTop).toBe(600);
  });
  it('forwards a swipe down at the table top to the review', () => {
    touch('touchstart', 100, 150);
    expect(touch('touchmove', 100, 200).defaultPrevented).toBe(true);
    expect(review.scrollTop).toBe(250);
  });
  it('preserves native table scrolling when there is room in that direction', () => {
    matrix.scrollTop = 200;
    touch('touchstart', 100, 200);
    expect(touch('touchmove', 100, 150).defaultPrevented).toBe(false);
    expect(review.scrollTop).toBe(300);
  });
  it('does not hijack horizontal swipes, taps or zoom', () => {
    matrix.scrollTop = 600;
    touch('touchstart', 100, 200);
    expect(touch('touchmove', 160, 190).defaultPrevented).toBe(false);
    touch('touchstart', 100, 200);
    expect(touch('touchmove', 100, 197).defaultPrevented).toBe(false);
    touch('touchstart', 100, 200, { count: 2 });
    expect(touch('touchmove', 100, 150, { count: 2 }).defaultPrevented).toBe(false);
    expect(review.scrollTop).toBe(300);
  });
  it('leaves text fields and non-cancelable native gestures alone', () => {
    const field = document.createElement('textarea'); matrix.append(field);
    matrix.scrollTop = 600;
    touch('touchstart', 100, 200, { target: field });
    expect(touch('touchmove', 100, 150, { target: field }).defaultPrevented).toBe(false);
    touch('touchstart', 100, 200);
    expect(touch('touchmove', 100, 150, { cancelable: false }).defaultPrevented).toBe(false);
    expect(review.scrollTop).toBe(300);
  });
  it('leaves a nested source-field picker free to scroll independently', () => {
    const picker = document.createElement('fieldset'), label = document.createElement('label');
    picker.append(label); matrix.append(picker); matrix.scrollTop = 600;
    touch('touchstart', 100, 200, { target: label });
    expect(touch('touchmove', 100, 150, { target: label }).defaultPrevented).toBe(false);
    expect(review.scrollTop).toBe(300);
  });
  it('clamps at review boundaries and cleans up listeners', () => {
    matrix.scrollTop = 600; review.scrollTop = 890;
    touch('touchstart', 100, 200); touch('touchmove', 100, 150);
    expect(review.scrollTop).toBe(900);
    expect(touch('touchmove', 100, 100).defaultPrevented).toBe(false);
    dispose(); review.scrollTop = 300;
    touch('touchstart', 100, 200); touch('touchmove', 100, 150);
    expect(review.scrollTop).toBe(300);
  });
});
