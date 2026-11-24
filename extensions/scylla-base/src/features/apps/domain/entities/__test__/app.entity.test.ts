// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { appStateOf, featureFixOf, needsUpdate } from '../app.entity.ts';

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

describe('needsUpdate', () => {
  it('asks to update an outdated or an unsupported agent only', () => {
    expect(needsUpdate({ compatibility: 'outdated' })).toBe(true);
    expect(needsUpdate({ compatibility: 'unsupported' })).toBe(true);
    expect(needsUpdate({ compatibility: 'compatible' })).toBe(false);
    expect(needsUpdate({ compatibility: 'unknown' })).toBe(false);
  });
});

describe('featureFixOf', () => {
  it('asks for git on an agent with the protocol of the checkout, else for a new agent', () => {
    expect(featureFixOf({ protocol: 2 }, 'checkout')).toBe('install-git');
    expect(featureFixOf({ protocol: 0 }, 'checkout')).toBe('update-agent');
    expect(featureFixOf({ protocol: 2 }, 'cache')).toBe('update-agent');
  });
});
