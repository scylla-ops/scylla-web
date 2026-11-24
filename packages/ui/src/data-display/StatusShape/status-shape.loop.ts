import type { StatusShape } from './status-shape.engine.ts';

/**
 * One animation loop for every `StatusShape` of the page: one `requestAnimationFrame` steps
 * and paints them all, and it stops when the last one goes. Plain TypeScript: no rune here.
 */

export interface Ticker {
  shape: StatusShape;
  /** Draws the shape, unless it is off screen. */
  paint: () => void;
}

const tickers = new Set<Ticker>();
let frame = 0;
let last = 0;

const tick = (time: number) => {
  // A long pause (a hidden tab) counts as one frame: the dots do not jump ahead.
  const dt = Math.min(0.033, (time - last) / 1000);
  last = time;
  for (const ticker of tickers) {
    // Two sub-steps keep the stiff springs stable.
    ticker.shape.step(dt / 2);
    ticker.shape.step(dt / 2);
    ticker.paint();
  }
  frame = tickers.size > 0 ? requestAnimationFrame(tick) : 0;
};

export const addTicker = (ticker: Ticker): (() => void) => {
  tickers.add(ticker);
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
  return () => {
    tickers.delete(ticker);
    if (tickers.size === 0 && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
};
