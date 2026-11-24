// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { springEasing } from '../spring.ts';

const samples = (ease: (t: number) => number) =>
  Array.from({ length: 1001 }, (_, i) => ease(i / 1000));

describe('springEasing', () => {
  it('starts at rest at 0 and ends on 1', () => {
    const ease = springEasing({ bounce: 0.2, duration: 450 });

    expect(ease(0)).toBe(0);
    expect(ease(0.01)).toBeLessThan(0.01);
    expect(ease(1)).toBe(1);
  });

  it('goes a little past the end with a bounce, and is settled at the end of its duration', () => {
    const ease = springEasing({ bounce: 0.2, duration: 450 });

    const peak = Math.max(...samples(ease));

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.05);
    expect(Math.abs(ease(0.999) - 1)).toBeLessThan(0.002);
  });

  it('goes further past the end with more bounce', () => {
    const soft = Math.max(...samples(springEasing({ bounce: 0.2, duration: 400 })));
    const bouncy = Math.max(...samples(springEasing({ bounce: 0.5, duration: 400 })));

    expect(bouncy).toBeGreaterThan(soft);
  });
});
