export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourSize {
  width: number;
  height: number;
}

export interface TourPlacement {
  x: number;
  y: number;
  connector: string | null;
}

export const CARD_GAP = 56;
export const NEAR_GAP = 16;
export const VIEWPORT_MARGIN = 16;
export const SPOTLIGHT_PADDING = 8;
export const SPOTLIGHT_EDGE = 2;
export const SPOTLIGHT_RADIUS = 10;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const curve = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  axis: 'x' | 'y',
): string => {
  const bend = CARD_GAP / 2;
  const [c1, c2] =
    axis === 'x'
      ? [
          { x: from.x + Math.sign(to.x - from.x) * bend, y: from.y },
          { x: to.x - Math.sign(to.x - from.x) * bend, y: to.y },
        ]
      : [
          { x: from.x, y: from.y + Math.sign(to.y - from.y) * bend },
          { x: to.x, y: to.y - Math.sign(to.y - from.y) * bend },
        ];
  const point = (p: { x: number; y: number }) => `${Math.round(p.x)} ${Math.round(p.y)}`;
  return `M ${point(from)} C ${point(c1)}, ${point(c2)}, ${point(to)}`;
};

const overlapArea = (a: TourRect, b: TourRect): number => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
};

const clipRect = (rect: TourRect, to: TourRect): TourRect => {
  const left = Math.max(rect.x, to.x);
  const top = Math.max(rect.y, to.y);
  const right = Math.min(rect.x + rect.width, to.x + to.width);
  const bottom = Math.min(rect.y + rect.height, to.y + to.height);
  return { x: left, y: top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
};

/**
 * The first side with room and no overlap, else the place that covers `avoid` the least, then the
 * target, then `others`: the other targets of the step, which the card may cover if it must.
 */
export const placeCard = (
  target: TourRect,
  card: TourSize,
  viewport: TourSize,
  avoid: readonly TourRect[] = [],
  others: readonly TourRect[] = [],
): TourPlacement => {
  const right = target.x + target.width;
  const bottom = target.y + target.height;
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  const maxX = viewport.width - card.width - VIEWPORT_MARGIN;
  const maxY = viewport.height - card.height - VIEWPORT_MARGIN;

  const tall = target.height > viewport.height * 0.6;
  const alignedY = clamp(
    tall ? target.y + viewport.height * 0.2 : centerY - card.height / 2,
    VIEWPORT_MARGIN,
    maxY,
  );
  const alignedX = clamp(centerX - card.width / 2, VIEWPORT_MARGIN, maxX);
  const anchorY = (y: number) => clamp(centerY, y + 16, y + card.height - 16);
  const anchorX = (x: number) => clamp(centerX, x + 16, x + card.width - 16);

  const beside = (gap: number): TourPlacement[] => {
    const line = (from: { x: number; y: number }, to: { x: number; y: number }, axis: 'x' | 'y') =>
      gap === CARD_GAP ? curve(from, to, axis) : null;
    const places: TourPlacement[] = [];
    if (right + gap <= maxX) {
      const x = right + gap;
      const y = alignedY;
      const from = { x, y: anchorY(y) };
      places.push({
        x,
        y,
        connector: line(from, { x: right, y: clamp(from.y, target.y, bottom) }, 'x'),
      });
    }
    if (bottom + gap <= maxY) {
      const x = alignedX;
      const y = bottom + gap;
      const from = { x: anchorX(x), y };
      places.push({
        x,
        y,
        connector: line(from, { x: clamp(from.x, target.x, right), y: bottom }, 'y'),
      });
    }
    if (target.x - gap - card.width >= VIEWPORT_MARGIN) {
      const x = target.x - gap - card.width;
      const y = alignedY;
      const from = { x: x + card.width, y: anchorY(y) };
      places.push({
        x,
        y,
        connector: line(from, { x: target.x, y: clamp(from.y, target.y, bottom) }, 'x'),
      });
    }
    if (target.y - gap - card.height >= VIEWPORT_MARGIN) {
      const x = alignedX;
      const y = target.y - gap - card.height;
      const from = { x: anchorX(x), y: y + card.height };
      places.push({
        x,
        y,
        connector: line(from, { x: clamp(from.x, target.x, right), y: target.y }, 'y'),
      });
    }
    return places;
  };

  const covered = ({ x, y }: TourPlacement) =>
    [avoid, [target], others].map(rects =>
      rects.reduce((area, rect) => area + overlapArea({ x, y, ...card }, rect), 0),
    );

  const sides = [...beside(CARD_GAP), ...beside(NEAR_GAP)];
  const free = sides.find(place => covered(place).every(area => area === 0));
  if (free) return free;

  const roomLeft = target.x;
  const roomRight = viewport.width - right;
  const y = alignedY;
  const below = y + card.height;
  const canHook = below + CARD_GAP / 2 < Math.min(bottom, viewport.height);
  const farRight = Math.max(maxX, VIEWPORT_MARGIN);
  const farBottom = Math.max(maxY, VIEWPORT_MARGIN);
  const over = (): TourPlacement => {
    if (roomLeft >= roomRight) {
      const x = VIEWPORT_MARGIN;
      const hookX = target.x - CARD_GAP;
      const connector =
        canHook && hookX > x
          ? curve({ x: hookX, y: below }, { x: target.x, y: below + CARD_GAP / 2 }, 'y')
          : null;
      return { x, y, connector };
    }
    const x = farRight;
    const hookX = right + CARD_GAP;
    const connector =
      canHook && hookX < x + card.width
        ? curve({ x: hookX, y: below }, { x: right, y: below + CARD_GAP / 2 }, 'y')
        : null;
    return { x, y, connector };
  };

  const places: readonly TourPlacement[] = [
    over(),
    { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN, connector: null },
    { x: farRight, y: VIEWPORT_MARGIN, connector: null },
    { x: VIEWPORT_MARGIN, y: farBottom, connector: null },
    { x: farRight, y: farBottom, connector: null },
    ...sides,
  ];
  return places.reduce((best, place) => {
    const areas = covered(place);
    const bestAreas = covered(best);
    const first = areas.findIndex((area, tier) => area !== bestAreas[tier]);
    return first >= 0 && areas[first] < bestAreas[first] ? place : best;
  });
};

export const padRect = (rect: TourRect, padding = SPOTLIGHT_PADDING): TourRect => ({
  x: rect.x - padding,
  y: rect.y - padding,
  width: rect.width + padding * 2,
  height: rect.height + padding * 2,
});

const viewportBox = ({ width, height }: TourSize): TourRect => ({ x: 0, y: 0, width, height });

/** The part of the viewport that shows through the scrollers around an element. */
export const visibleArea = (viewport: TourSize, scrollers: readonly TourRect[]): TourRect =>
  scrollers.reduce(clipRect, viewportBox(viewport));

/** The padded target, cut by its scrollers and kept inside the viewport: its ring stays whole. */
export const spotlightRect = (
  rect: TourRect,
  viewport: TourSize,
  scrollers: readonly TourRect[] = [],
): TourRect =>
  clipRect(scrollers.reduce(clipRect, padRect(rect)), {
    x: SPOTLIGHT_EDGE,
    y: SPOTLIGHT_EDGE,
    width: viewport.width - SPOTLIGHT_EDGE * 2,
    height: viewport.height - SPOTLIGHT_EDGE * 2,
  });

export const presentRects = (rects: readonly (TourRect | null | undefined)[]): TourRect[] =>
  rects.filter((rect): rect is TourRect => !!rect && rect.width > 0 && rect.height > 0);

/**
 * How to bring a target into view, or `null` when it shows. A target taller than the area shows
 * from its top.
 */
export const scrollPlan = (rect: TourRect, area: TourRect): 'start' | 'center' | null => {
  const areaBottom = area.y + area.height;
  const inside =
    rect.x >= area.x &&
    rect.y >= area.y &&
    rect.x + rect.width <= area.x + area.width &&
    rect.y + rect.height <= areaBottom;
  if (inside) return null;
  if (rect.height <= area.height) return 'center';
  return rect.y >= area.y && rect.y < areaBottom ? null : 'start';
};

const roundedRect = ({ x, y, width, height }: TourRect, radius: number): string => {
  const r = Math.min(radius, width / 2, height / 2);
  return (
    `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} ` +
    `V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
    `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
};

/** The even-odd rule fills a hole inside a hole: holes that touch become their bounding box. */
export const mergeHoles = (holes: readonly TourRect[]): readonly TourRect[] => {
  for (const [index, hole] of holes.entries()) {
    const other = holes.find((rect, at) => at > index && overlapArea(hole, rect) > 0);
    if (other) {
      const union = unionRect([hole, other]) ?? hole;
      return mergeHoles([union, ...holes.filter(rect => rect !== hole && rect !== other)]);
    }
  }
  return holes;
};

export const dimPath = (viewport: TourSize, holes: readonly TourRect[]): string =>
  [
    `M 0 0 H ${viewport.width} V ${viewport.height} H 0 Z`,
    ...mergeHoles(holes).map(hole => roundedRect(hole, SPOTLIGHT_RADIUS)),
  ].join(' ');

export const ringPath = (rect: TourRect): string => roundedRect(rect, SPOTLIGHT_RADIUS);

/** A `display: contents` wrapper has no box of its own. */
export const unionRect = (rects: readonly TourRect[]): TourRect | null => {
  const boxes = rects.filter(rect => rect.width > 0 || rect.height > 0);
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map(rect => rect.x));
  const top = Math.min(...boxes.map(rect => rect.y));
  const right = Math.max(...boxes.map(rect => rect.x + rect.width));
  const bottom = Math.max(...boxes.map(rect => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export const easeRects = (
  from: readonly (TourRect | null)[],
  to: readonly (TourRect | null)[],
  progress: number,
): (TourRect | null)[] => {
  const eased = easeOutCubic(Math.min(Math.max(progress, 0), 1));
  const between = (a: number, b: number) => a + (b - a) * eased;
  return to.map((target, index) => {
    const start = from[index] ?? from[0];
    if (!target || !start) return target;
    return {
      x: between(start.x, target.x),
      y: between(start.y, target.y),
      width: between(start.width, target.width),
      height: between(start.height, target.height),
    };
  });
};
