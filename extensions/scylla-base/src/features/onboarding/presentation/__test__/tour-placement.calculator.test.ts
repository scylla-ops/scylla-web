// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  CARD_GAP,
  VIEWPORT_MARGIN,
  dimPath,
  easeRects,
  padRect,
  placeCard,
  spotlightRect,
  unionRect,
} from '../tour-placement.calculator.ts';

const viewport = { width: 1440, height: 900 };
const card = { width: 360, height: 150 };

describe('placeCard', () => {
  it('puts the card on the right of a small target, level with it', () => {
    const target = { x: 16, y: 200, width: 220, height: 36 };

    const placement = placeCard(target, card, viewport);

    expect(placement.x).toBe(target.x + target.width + CARD_GAP);
    expect(placement.y).toBe(218 - card.height / 2);
    expect(placement.connector).toMatch(/^M \d+ \d+ C /);
  });

  it('goes below when the right side has no room', () => {
    const target = { x: 1200, y: 60, width: 200, height: 40 };

    const placement = placeCard(target, card, viewport);

    expect(placement.y).toBe(target.y + target.height + CARD_GAP);
    expect(placement.x + card.width).toBeLessThanOrEqual(viewport.width - VIEWPORT_MARGIN);
  });

  it('goes above a target at the bottom right', () => {
    const target = { x: 1200, y: 820, width: 200, height: 40 };

    const placement = placeCard(target, card, viewport);

    expect(placement.x + card.width).toBeLessThanOrEqual(target.x - CARD_GAP);
  });

  it('lays the card over the edge of a target that fills the page, on the roomier side', () => {
    const page = { x: 256, y: 0, width: 1184, height: 900 };

    const placement = placeCard(page, card, viewport);

    expect(placement.x).toBe(VIEWPORT_MARGIN);
    expect(placement.y).toBe(page.y + viewport.height * 0.2);
    expect(placement.connector).not.toBeNull();
  });

  it('keeps the card inside the viewport', () => {
    const target = { x: 16, y: 860, width: 100, height: 30 };

    const placement = placeCard(target, card, viewport);

    expect(placement.y + card.height).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN);
    expect(placement.y).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
  });
});

describe('unionRect', () => {
  it('boxes the children of a wrapper that has no box of its own', () => {
    expect(
      unionRect([
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 0, y: 0, width: 0, height: 0 },
        { x: 40, y: 5, width: 10, height: 10 },
      ]),
    ).toEqual({ x: 10, y: 5, width: 40, height: 25 });
  });

  it('finds nothing when no child is laid out', () => {
    expect(unionRect([{ x: 0, y: 0, width: 0, height: 0 }])).toBeNull();
  });
});

describe('dimPath', () => {
  it('cuts one hole per target in the dim', () => {
    const path = dimPath(viewport, [
      padRect({ x: 10, y: 10, width: 20, height: 20 }),
      padRect({ x: 100, y: 10, width: 20, height: 20 }),
    ]);

    expect(path.match(/Z/g)).toHaveLength(3);
  });
});

describe('spotlightRect', () => {
  it('leaves room around a small target', () => {
    expect(spotlightRect({ x: 100, y: 100, width: 200, height: 36 }, viewport)).toEqual({
      x: 92,
      y: 92,
      width: 216,
      height: 52,
    });
  });

  it('keeps the ring of a target that touches the viewport edges inside the screen', () => {
    expect(spotlightRect({ x: 0, y: 0, width: 1440, height: 900 }, viewport)).toEqual({
      x: 2,
      y: 2,
      width: 1436,
      height: 896,
    });
  });
});

describe('easeRects', () => {
  const from = { x: 0, y: 0, width: 100, height: 40 };
  const to = { x: 200, y: 100, width: 50, height: 20 };

  it('starts at the previous box and ends exactly on the new one', () => {
    expect(easeRects([from], [to], 0)).toEqual([from]);
    expect(easeRects([from], [to], 1)).toEqual([to]);
  });

  it('moves fast first, then slows down', () => {
    const [half] = easeRects([from], [to], 0.5);

    expect(half!.x).toBeGreaterThan(100);
    expect(half!.x).toBeLessThan(200);
  });

  it('lets a new second target grow from the first one', () => {
    const [, second] = easeRects([from], [to, to], 0);

    expect(second).toEqual(from);
  });
});
