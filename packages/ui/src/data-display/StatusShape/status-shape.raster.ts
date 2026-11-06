/**
 * The metaballs, drawn into RGBA pixels. Each dot adds r² / distance² to a field; the surface
 * is where the field reaches 1: a lone dot is a disc of radius r, and two close dots flow into
 * one shape. Typed arrays and plain loops only: it runs for every pixel, every frame.
 */

/** A dot, as the raster reads it: 6 numbers. */
export const BALL_STRIDE = 6;

/**
 * Writes a ball at `index` of `balls`: a capsule (round ends, one width) of half length `half`
 * along (ux, uy); a disc when `half` is 0. `r2` is its radius squared.
 */
export const writeBall = (
  balls: Float64Array,
  index: number,
  ball: { x: number; y: number; r2: number; ux: number; uy: number; half: number },
): void => {
  balls.set([ball.x, ball.y, ball.r2, ball.ux, ball.uy, ball.half], index * BALL_STRIDE);
};

const G = new Float64Array(2);
const SHARE = new Float64Array(8);

/** The field of the balls at a pixel; its gradient goes to `G`, the share of each ball to `SHARE`. */
const field = (balls: Float64Array, count: number, x: number, y: number): number => {
  let sum = 0;
  G[0] = 0;
  G[1] = 0;
  for (let j = 0, o = 0; j < count; j++, o += BALL_STRIDE) {
    const dx = x - balls[o], dy = y - balls[o + 1], ux = balls[o + 3], uy = balls[o + 4];
    const across = dy * ux - dx * uy;
    const raw = dx * ux + dy * uy;
    let along = (raw < 0 ? -raw : raw) - balls[o + 5];
    if (along < 0) along = 0;
    const d2 = along * along + across * across + 1e-6;
    const v = balls[o + 2] / d2;
    SHARE[j] = v;
    sum += v;
    // ∇v = −v / d² · ∇d², with ∇d² = 2 (along·sign·u + across·u⊥)
    const as = raw < 0 ? -along : along, w = (-2 * v) / d2;
    G[0] += w * (as * ux - across * uy);
    G[1] += w * (as * uy + across * ux);
  }
  return sum;
};

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Fills the `box` of `data` (`width` pixels a line) with the balls, each pixel colored by the
 * share of each ball (`colors`: r, g, b per ball). Coverage is (field − 1) / |gradient|: the
 * distance to the edge in pixels, so every edge is smooth over one pixel.
 */
export const rasterize = (
  data: Uint8ClampedArray,
  width: number,
  box: Box,
  balls: Float64Array,
  count: number,
  colors: Float64Array,
): void => {
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const f = field(balls, count, x + 0.5, y + 0.5);
      const i = (y * width + x) * 4;
      // Deep inside, the pixel is full: near a center the gradient is not usable.
      let a = f > 2 ? 1 : (f - 1) / ((G[0] * G[0] + G[1] * G[1]) ** 0.5 + 1e-6) + 0.5;
      if (a <= 0) {
        data[i + 3] = 0;
        continue;
      }
      if (a > 1) a = 1;
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < count; j++) {
        r += SHARE[j] * colors[j * 3];
        g += SHARE[j] * colors[j * 3 + 1];
        b += SHARE[j] * colors[j * 3 + 2];
      }
      data[i] = r / f;
      data[i + 1] = g / f;
      data[i + 2] = b / f;
      data[i + 3] = a * 255;
    }
  }
};
