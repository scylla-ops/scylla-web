import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render } from '@test/render.ts';
import { ARRIVAL_MS, arrival } from './arrival.state.svelte.ts';
import ArrivalOverlay from './ArrivalOverlay.svelte';

const overlay = () => document.querySelector('[data-slot="arrival"]');
const appCover = () => document.querySelector('[data-slot="arrival-back"]');

const media = (matching: readonly string[]) =>
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: matching.includes(query) }) as MediaQueryList,
  );

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  arrival.reset();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('ArrivalOverlay', () => {
  it('shows nothing without a sign-in', () => {
    render(ArrivalOverlay);

    expect(overlay()).toBeNull();
  });

  it('covers the page with the panel and the mark from the curtain on', () => {
    media(['(min-width: 64rem)']);
    render(ArrivalOverlay);

    arrival.begin(() => undefined);
    flushSync();
    expect(overlay()).toBeNull();

    vi.advanceTimersByTime(ARRIVAL_MS.light);
    flushSync();
    expect(overlay()).toHaveAttribute('aria-hidden', 'true');
    expect(overlay()?.querySelector('[data-part="arrival-panel"]')).not.toBeNull();
    expect(overlay()?.querySelector('[data-part="arrival-mark"]')).not.toBeNull();
  });

  it('is a veil with the mark at the center below lg', () => {
    media([]);
    render(ArrivalOverlay);

    arrival.begin(() => undefined);
    vi.advanceTimersByTime(ARRIVAL_MS.fade);
    flushSync();

    expect(overlay()).not.toBeNull();
    expect(overlay()?.querySelector('[data-part="arrival-panel"]')).toBeNull();
    expect(overlay()?.querySelector('img')).not.toBeNull();
  });

  describe('after a sign-in with a provider', () => {
    const backFromProvider = () =>
      sessionStorage.setItem(
        'scylla.sign-in-arrival',
        JSON.stringify({ at: Date.now(), to: window.location.pathname }),
      );

    it('hides the app under the panel of the sign-in page from the first frame', () => {
      media(['(min-width: 64rem)']);
      backFromProvider();

      render(ArrivalOverlay);

      expect(appCover()).toHaveAttribute('aria-hidden', 'true');
      const mark = appCover()?.querySelector('[data-slot="logo-mark"]');
      expect(mark).toHaveAttribute('data-state', 'idle');
      vi.advanceTimersByTime(ARRIVAL_MS.back);
      flushSync();
      expect(mark).toHaveAttribute('data-state', 'lit');
      expect(overlay()).toBeNull();
    });

    it('closes the curtain over it, then removes it under the full panel', () => {
      media(['(min-width: 64rem)']);
      backFromProvider();
      render(ArrivalOverlay);

      vi.advanceTimersByTime(ARRIVAL_MS.back + ARRIVAL_MS.light);
      flushSync();
      expect(overlay()?.querySelector('[data-part="arrival-panel"]')).not.toBeNull();
      expect(appCover()).not.toBeNull();

      vi.advanceTimersByTime(ARRIVAL_MS.curtain);
      flushSync();
      expect(overlay()).not.toBeNull();
      expect(appCover()).toBeNull();
    });

    it('shows the veil from the first frame below lg', () => {
      media([]);
      backFromProvider();

      render(ArrivalOverlay);

      expect(overlay()?.querySelector('img')).not.toBeNull();
      expect(appCover()).toBeNull();
    });

    it('plays nothing at the start of a page that is not the return path', () => {
      media(['(min-width: 64rem)']);
      sessionStorage.setItem(
        'scylla.sign-in-arrival',
        JSON.stringify({ at: Date.now(), to: '/acme/dashboard' }),
      );

      render(ArrivalOverlay);

      expect(appCover()).toBeNull();
      expect(overlay()).toBeNull();
    });
  });
});
