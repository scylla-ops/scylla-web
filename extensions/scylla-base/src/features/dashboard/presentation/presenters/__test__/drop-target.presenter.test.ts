// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dropIndexAt, type DropSlot } from '../drop-target.presenter.ts';

const slot = (index: number, left: number, top: number, width: number, height: number): DropSlot => ({
  index,
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const slots = [slot(0, 0, 0, 544, 440), slot(1, 560, 0, 544, 212), slot(2, 560, 228, 264, 212), slot(3, 0, 456, 1104, 98)];
const area = { left: 0, top: 0, right: 1104, bottom: 554 };

describe('dropIndexAt', () => {
  it('takes the slot under the pointer, its edges and corners too', () => {
    expect(dropIndexAt(272, 220, slots, area)).toBe(0);
    expect(dropIndexAt(1, 1, slots, area)).toBe(0);
    expect(dropIndexAt(543, 439, slots, area)).toBe(0);
    expect(dropIndexAt(561, 227 - 26, slots, area)).toBe(1);
    expect(dropIndexAt(823, 439, slots, area)).toBe(2);
    expect(dropIndexAt(1100, 550, slots, area)).toBe(3);
  });

  it('takes the nearest slot in a gap of the grid', () => {
    expect(dropIndexAt(552, 100, slots, area)).toBe(0);
    expect(dropIndexAt(900, 300, slots, area)).toBe(2);
    expect(dropIndexAt(1000, 300, slots, area)).toBe(1);
  });

  it('gives nothing out of the grid or with no slot', () => {
    expect(dropIndexAt(1200, 100, slots, area)).toBeNull();
    expect(dropIndexAt(10, 10, [], area)).toBeNull();
  });
});
