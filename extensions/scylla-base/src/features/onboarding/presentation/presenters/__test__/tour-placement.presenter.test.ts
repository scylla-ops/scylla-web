// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  CARD_GAP,
  NEAR_GAP,
  VIEWPORT_MARGIN,
  dimPath,
  easeRects,
  mergeHoles,
  padRect,
  placeCard,
  presentRects,
  scrollPlan,
  spotlightRect,
  unionRect,
  visibleArea,
} from '../tour-placement.presenter.ts';

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

  describe('with something to keep clear of', () => {
    const covers = (
      place: { x: number; y: number },
      rect: { x: number; y: number; width: number; height: number },
    ) =>
      place.x < rect.x + rect.width &&
      place.x + card.width > rect.x &&
      place.y < rect.y + rect.height &&
      place.y + card.height > rect.y;

    it('takes the next side when the first one covers it', () => {
      const target = { x: 16, y: 200, width: 220, height: 36 };
      const menu = { x: 280, y: 100, width: 400, height: 150 };

      const placement = placeCard(target, card, viewport, [menu]);

      expect(covers(placement, menu)).toBe(false);
      expect(covers(placement, target)).toBe(false);
      expect(placement.y).toBe(target.y + target.height + CARD_GAP);
    });

    it('comes close to the target, with no line, when the far places are taken', () => {
      const target = { x: 16, y: 300, width: 220, height: 36 };
      const small = { width: 200, height: 100 };
      const farRight = {
        x: target.x + target.width + NEAR_GAP + small.width,
        y: 0,
        width: 40,
        height: 900,
      };
      const farBelow = { x: 0, y: 450, width: 1440, height: 450 };
      const above = { x: 0, y: 0, width: 1440, height: 250 };

      const placement = placeCard(target, small, { width: 1440, height: 900 }, [
        farRight,
        farBelow,
        above,
      ]);

      expect(placement.connector).toBeNull();
      expect(placement.x).toBe(target.x + target.width + NEAR_GAP);
    });

    it('covers the target the least when nothing is free, as on a phone', () => {
      const phone = { width: 390, height: 844 };
      const narrow = { width: 358, height: 260 };
      const dialog = { x: 16, y: 200, width: 358, height: 400 };

      const placement = placeCard(dialog, narrow, phone);

      expect(placement).toMatchObject({ x: VIEWPORT_MARGIN, y: 568, connector: null });
    });

    it('stays off what must stay in view, even if it covers more of the target', () => {
      const phone = { width: 390, height: 844 };
      const narrow = { width: 358, height: 260 };
      const form = { x: 16, y: 84, width: 358, height: 732 };
      const name = { x: 40, y: 150, width: 300, height: 40 };

      expect(placeCard(form, narrow, phone).y).toBe(VIEWPORT_MARGIN);
      expect(placeCard(form, narrow, phone, [name]).y).toBe(568);
    });

    it('never covers the target to spare another target of the step', () => {
      const phone = { width: 390, height: 844 };
      const submit = { x: 308, y: 72, width: 66, height: 32 };
      const editor = { x: 8, y: 64, width: 374, height: 770 };

      expect(covers(placeCard(submit, card, phone, [], [editor]), submit)).toBe(false);
    });
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

  it('cuts one hole for a target inside another: the even-odd rule would fill it', () => {
    const editor = { x: 100, y: 100, width: 800, height: 600 };
    const create = { x: 700, y: 120, width: 80, height: 32 };

    expect(dimPath(viewport, [create, editor]).match(/Z/g)).toHaveLength(2);
  });
});

describe('mergeHoles', () => {
  const a = { x: 0, y: 0, width: 100, height: 100 };

  it('keeps apart the holes that do not touch', () => {
    const far = { x: 200, y: 0, width: 50, height: 50 };

    expect(mergeHoles([a, far])).toEqual([a, far]);
  });

  it('makes one bounding box of two holes that overlap', () => {
    const b = { x: 50, y: 50, width: 100, height: 100 };

    expect(mergeHoles([a, b])).toEqual([{ x: 0, y: 0, width: 150, height: 150 }]);
  });

  it('merges again when the new box reaches a third hole', () => {
    const b = { x: 50, y: 50, width: 100, height: 100 };
    const c = { x: 140, y: 0, width: 20, height: 20 };

    expect(mergeHoles([a, c, b])).toEqual([{ x: 0, y: 0, width: 160, height: 150 }]);
  });
});

describe('presentRects', () => {
  it('drops an absent target and one that its scroller hides', () => {
    const shown = { x: 0, y: 0, width: 10, height: 10 };

    expect(presentRects([null, shown, { x: 5, y: 5, width: 0, height: 10 }])).toEqual([shown]);
  });
});

describe('scrollPlan', () => {
  const area = { x: 0, y: 0, width: 1440, height: 900 };

  it('leaves a target that shows', () => {
    expect(scrollPlan({ x: 10, y: 10, width: 100, height: 100 }, area)).toBeNull();
  });

  it('centers a target outside the area', () => {
    expect(scrollPlan({ x: 10, y: 950, width: 100, height: 100 }, area)).toBe('center');
  });

  it('leaves a target taller than the area while its top shows', () => {
    expect(scrollPlan({ x: 10, y: 40, width: 100, height: 2000 }, area)).toBeNull();
  });

  it('brings the top of a target taller than the area into view', () => {
    expect(scrollPlan({ x: 10, y: -300, width: 100, height: 2000 }, area)).toBe('start');
    expect(scrollPlan({ x: 10, y: 1000, width: 100, height: 2000 }, area)).toBe('start');
  });
});

describe('visibleArea', () => {
  it('is the viewport cut by the scrollers', () => {
    expect(visibleArea(viewport, [{ x: 256, y: 64, width: 2000, height: 2000 }])).toEqual({
      x: 256,
      y: 64,
      width: 1184,
      height: 836,
    });
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

  it('cuts the hole at the edge of the scroller, so that it opens nothing over the top bar', () => {
    const scroller = { x: 256, y: 64, width: 1184, height: 836 };

    expect(spotlightRect({ x: 300, y: 40, width: 200, height: 100 }, viewport, [scroller])).toEqual(
      {
        x: 292,
        y: 64,
        width: 216,
        height: 84,
      },
    );
  });

  it('has no area when the scroller hides the whole target', () => {
    const scroller = { x: 256, y: 64, width: 1184, height: 836 };

    const hidden = spotlightRect({ x: 300, y: -200, width: 200, height: 100 }, viewport, [
      scroller,
    ]);

    expect(hidden.height).toBe(0);
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
