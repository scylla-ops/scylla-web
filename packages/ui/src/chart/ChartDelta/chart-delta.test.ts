// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { deltaTrend } from './chart-delta.ts';

describe('deltaTrend', () => {
  it('makes a rise good when up is better', () => {
    expect(deltaTrend(3.4, 'up')).toEqual({ direction: 'up', tone: 'good' });
    expect(deltaTrend(-3.4, 'up')).toEqual({ direction: 'down', tone: 'bad' });
  });

  it('makes a fall good when down is better', () => {
    expect(deltaTrend(-12, 'down')).toEqual({ direction: 'down', tone: 'good' });
    expect(deltaTrend(12, 'down')).toEqual({ direction: 'up', tone: 'bad' });
  });

  it('makes no change and a value that is not a number flat and neutral', () => {
    expect(deltaTrend(0, 'up')).toEqual({ direction: 'flat', tone: 'neutral' });
    expect(deltaTrend(Number.NaN, 'down')).toEqual({ direction: 'flat', tone: 'neutral' });
  });
});
