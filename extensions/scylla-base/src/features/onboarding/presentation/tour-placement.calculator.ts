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

export const placeCard = (target: TourRect, card: TourSize, viewport: TourSize): TourPlacement => {
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

  if (right + CARD_GAP <= maxX) {
    const x = right + CARD_GAP;
    const y = alignedY;
    const from = { x, y: anchorY(y) };
    return { x, y, connector: curve(from, { x: right, y: clamp(from.y, target.y, bottom) }, 'x') };
  }
  if (bottom + CARD_GAP <= maxY) {
    const x = alignedX;
    const y = bottom + CARD_GAP;
    const from = { x: anchorX(x), y };
    return { x, y, connector: curve(from, { x: clamp(from.x, target.x, right), y: bottom }, 'y') };
  }
  if (target.x - CARD_GAP - card.width >= VIEWPORT_MARGIN) {
    const x = target.x - CARD_GAP - card.width;
    const y = alignedY;
    const from = { x: x + card.width, y: anchorY(y) };
    return {
      x,
      y,
      connector: curve(from, { x: target.x, y: clamp(from.y, target.y, bottom) }, 'x'),
    };
  }
  if (target.y - CARD_GAP - card.height >= VIEWPORT_MARGIN) {
    const x = alignedX;
    const y = target.y - CARD_GAP - card.height;
    const from = { x: anchorX(x), y: y + card.height };
    return {
      x,
      y,
      connector: curve(from, { x: clamp(from.x, target.x, right), y: target.y }, 'y'),
    };
  }

  const roomLeft = target.x;
  const roomRight = viewport.width - right;
  const y = alignedY;
  const below = y + card.height;
  const canHook = below + CARD_GAP / 2 < Math.min(bottom, viewport.height);
  if (roomLeft >= roomRight) {
    const x = VIEWPORT_MARGIN;
    const hookX = target.x - CARD_GAP;
    const connector =
      canHook && hookX > x
        ? curve({ x: hookX, y: below }, { x: target.x, y: below + CARD_GAP / 2 }, 'y')
        : null;
    return { x, y, connector };
  }
  const x = clamp(viewport.width - card.width - VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxX);
  const hookX = right + CARD_GAP;
  const connector =
    canHook && hookX < x + card.width
      ? curve({ x: hookX, y: below }, { x: right, y: below + CARD_GAP / 2 }, 'y')
      : null;
  return { x, y, connector };
};

export const padRect = (rect: TourRect, padding = SPOTLIGHT_PADDING): TourRect => ({
  x: rect.x - padding,
  y: rect.y - padding,
  width: rect.width + padding * 2,
  height: rect.height + padding * 2,
});

/** The padded target, kept inside the viewport so that its ring is never cut. */
export const spotlightRect = (rect: TourRect, viewport: TourSize): TourRect => {
  const padded = padRect(rect);
  const left = Math.max(padded.x, SPOTLIGHT_EDGE);
  const top = Math.max(padded.y, SPOTLIGHT_EDGE);
  const right = Math.min(padded.x + padded.width, viewport.width - SPOTLIGHT_EDGE);
  const bottom = Math.min(padded.y + padded.height, viewport.height - SPOTLIGHT_EDGE);
  return { x: left, y: top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
};

const roundedRect = ({ x, y, width, height }: TourRect, radius: number): string => {
  const r = Math.min(radius, width / 2, height / 2);
  return (
    `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} ` +
    `V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
    `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
};

export const dimPath = (viewport: TourSize, holes: readonly TourRect[]): string =>
  [
    `M 0 0 H ${viewport.width} V ${viewport.height} H 0 Z`,
    ...holes.map(hole => roundedRect(hole, SPOTLIGHT_RADIUS)),
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
