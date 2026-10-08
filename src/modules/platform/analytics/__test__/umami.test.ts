import { afterEach, describe, expect, it, vi } from 'vitest';
import { initAnalytics, trackEvent } from '../umami.ts';

const UMAMI_SRC = 'https://umami.example.com/script.js';
const WEBSITE_ID = 'abc-123';

const injectedScript = () =>
  document.head.querySelector<HTMLScriptElement>('script[data-website-id]');

describe('initAnalytics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    injectedScript()?.remove();
  });

  it('injects nothing outside a production build', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_UMAMI_SRC', UMAMI_SRC);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', WEBSITE_ID);

    initAnalytics();

    expect(injectedScript()).toBeNull();
  });

  it('injects nothing in a production build without both env vars set', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_UMAMI_SRC', UMAMI_SRC);

    initAnalytics();

    expect(injectedScript()).toBeNull();
  });

  it('injects the tracker script in a production build with both env vars set', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_UMAMI_SRC', UMAMI_SRC);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', WEBSITE_ID);

    initAnalytics();

    const script = injectedScript();
    expect(script?.src).toBe(UMAMI_SRC);
    expect(script?.dataset.websiteId).toBe(WEBSITE_ID);
    expect(script?.async).toBe(true);
  });
});

describe('trackEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the event name and data to window.umami.track', () => {
    const track = vi.fn();
    vi.stubGlobal('umami', { track });

    trackEvent('secret-created', { projectId: 'proj-1' });

    expect(track).toHaveBeenCalledWith('secret-created', { projectId: 'proj-1' });
  });

  it('does not throw when window.umami is absent', () => {
    expect(() => trackEvent('secret-created')).not.toThrow();
  });
});
