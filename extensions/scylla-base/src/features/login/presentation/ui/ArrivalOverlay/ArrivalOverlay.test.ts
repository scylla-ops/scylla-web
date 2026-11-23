import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render } from '@test/render.ts';
import { ARRIVAL_MS, arrival } from './arrival.state.svelte.ts';
import ArrivalOverlay from './ArrivalOverlay.svelte';

const overlay = () => document.querySelector('[data-slot="arrival"]');

const media = (matching: readonly string[]) =>
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: matching.includes(query) }) as MediaQueryList,
  );

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  arrival.reset();
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
});
