// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MAX_PINS, placeBefore, withoutPin, withPin } from '../project-layout.struct.ts';

describe('placeBefore', () => {
  it('puts a card before another card, or last', () => {
    expect(placeBefore(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(placeBefore(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a']);
    expect(placeBefore(['a', 'b'], 'x', 'b')).toEqual(['a', 'x', 'b']);
  });

  it('puts the card last when the other card is not in the order, or is the card itself', () => {
    expect(placeBefore(['a', 'b', 'c'], 'a', 'gone')).toEqual(['b', 'c', 'a']);
    expect(placeBefore(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'c', 'b']);
  });
});

describe('withPin and withoutPin', () => {
  it('adds a pin at the end once, and removes it', () => {
    expect(withPin(['a'], 'b')).toEqual(['a', 'b']);
    expect(withPin(['a', 'b'], 'a')).toEqual(['a', 'b']);
    expect(withoutPin(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('keeps at most 100 pins', () => {
    const full = Array.from({ length: MAX_PINS }, (_, index) => `p-${index}`);

    expect(withPin(full, 'one-more')).toEqual(full);
  });
});
