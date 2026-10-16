// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { RESIZE_KEY_STEP, widthAfterDrag, widthAfterKey } from './resizable-panel.ts';

const bounds = { min: 200, max: 600 };

describe('widthAfterDrag', () => {
  it('widens a panel docked on the right when its handle moves left', () => {
    expect(widthAfterDrag(300, -50, 'start', bounds)).toBe(350);
    expect(widthAfterDrag(300, -50, 'end', bounds)).toBe(250);
  });

  it('stays within the bounds, in whole pixels', () => {
    expect(widthAfterDrag(300, -1000, 'start', bounds)).toBe(600);
    expect(widthAfterDrag(300, 1000, 'start', bounds)).toBe(200);
    expect(widthAfterDrag(300, -0.4, 'start', bounds)).toBe(300);
  });
});

describe('widthAfterKey', () => {
  it('moves the handle one step per arrow key, in the direction of the arrow', () => {
    expect(widthAfterKey(300, 'ArrowLeft', 'start', bounds)).toBe(300 + RESIZE_KEY_STEP);
    expect(widthAfterKey(300, 'ArrowRight', 'start', bounds)).toBe(300 - RESIZE_KEY_STEP);
  });

  it('jumps to the bounds with Home and End', () => {
    expect(widthAfterKey(300, 'Home', 'start', bounds)).toBe(200);
    expect(widthAfterKey(300, 'End', 'start', bounds)).toBe(600);
  });

  it('ignores the other keys', () => {
    expect(widthAfterKey(300, 'Enter', 'start', bounds)).toBeNull();
  });
});
