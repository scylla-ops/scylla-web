// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  formatDurationMs,
  formatPercent,
  memoryAmount,
  shortId,
  versionTag,
} from '../agent-format.presenter.ts';

describe('shortId', () => {
  it('keeps the first 8 and the last 4 characters', () => {
    expect(shortId('01m4gcb7x0q3w9d2e6f8k2p9')).toBe('01m4gcb7…k2p9');
  });

  it('leaves a short id whole', () => {
    expect(shortId('agent-1')).toBe('agent-1');
  });
});

describe('formatDurationMs', () => {
  it('reads seconds, minutes and hours the way the cards show them', () => {
    expect(formatDurationMs(42_000)).toBe('42 s');
    expect(formatDurationMs(102_000)).toBe('1 min 42 s');
    expect(formatDurationMs(123_000)).toBe('2 min 03 s');
    expect(formatDurationMs(7_500_000)).toBe('2 h 05 min');
  });

  it('shows a run under a second in milliseconds rather than as 0 s', () => {
    expect(formatDurationMs(350)).toBe('350 ms');
  });
});

describe('memoryAmount', () => {
  it('rounds to whole gigabytes from 1 GB up', () => {
    expect(memoryAmount(8192)).toEqual({ amount: 8, unit: 'GB' });
    expect(memoryAmount(512)).toEqual({ amount: 512, unit: 'MB' });
  });
});

describe('versionTag', () => {
  it('prefixes a bare version with v, once', () => {
    expect(versionTag('0.5.0')).toBe('v0.5.0');
    expect(versionTag('v0.5.0')).toBe('v0.5.0');
  });
});

describe('formatPercent', () => {
  it('follows the locale', () => {
    expect(formatPercent(0.976, 'en', 1)).toBe('97.6%');
    expect(formatPercent(0.976, 'fr', 1)).toBe('97,6 %');
  });
});
