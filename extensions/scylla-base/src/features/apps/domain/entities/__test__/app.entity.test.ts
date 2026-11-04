// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { appStateOf } from '../app.entity.ts';

describe('appStateOf', () => {
  it('is online while the stream is open', () => {
    expect(appStateOf({ runner: true, connected: true, lastSeenAt: '' })).toBe('online');
  });

  it('is offline for an agent seen before, with no stream now', () => {
    expect(appStateOf({ runner: true, connected: false, lastSeenAt: '2026-01-01' })).toBe(
      'offline',
    );
  });

  it('is never for an app that no machine joined', () => {
    expect(appStateOf({ runner: false, connected: false, lastSeenAt: '' })).toBe('never');
  });

  it('is online for another app seen before: it keeps no stream open', () => {
    expect(appStateOf({ runner: false, connected: false, lastSeenAt: '2026-01-01' })).toBe(
      'online',
    );
  });
});
