import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guardLeave } from '@scylla/core-sdk';
import { createAppRouter } from '../app-router.ts';
import { listenToLocation, location } from '../location.state.svelte.ts';
import TestFallback from '../../view/RouterView/fixtures/TestFallback.fixture.svelte';

const router = () =>
  createAppRouter({ mounts: { public: {} }, modules: [], fallback: TestFallback });

let held: (() => void) | null = null;
let stops: Array<() => void> = [];

const holdAll = () => {
  stops.push(
    guardLeave(leave => {
      held = leave;
      return true;
    }),
  );
};

beforeEach(() => {
  history.replaceState(null, '', '/agents/new');
  held = null;
});

afterEach(() => {
  stops.forEach(stop => stop());
  stops = [];
  document.body.innerHTML = '';
});

describe('the leave guard of the router', () => {
  it('holds a navigation until the page lets it go', () => {
    const navigator = router();
    holdAll();

    navigator.navigate('/agents');
    expect(location.pathname).toBe('/agents/new');

    held?.();
    expect(location.pathname).toBe('/agents');
  });

  it('lets a navigation go at once when the guard does not hold it', () => {
    const navigator = router();
    stops.push(guardLeave(() => false));

    navigator.navigate('/agents');

    expect(location.pathname).toBe('/agents');
  });

  it('never holds a redirect or a new query of the same page', () => {
    const navigator = router();
    holdAll();

    navigator.navigate('/agents/new?tab=2');
    expect(location.search).toBe('?tab=2');
    navigator.navigate('/agents/a-1/connect', { replace: true });
    expect(location.pathname).toBe('/agents/a-1/connect');
    expect(held).toBeNull();
  });

  it('stops asking once the page removes its guard', () => {
    const navigator = router();
    const stop = guardLeave(() => true);

    stop();
    navigator.navigate('/agents');

    expect(location.pathname).toBe('/agents');
  });

  it('holds a click on a link of the app', () => {
    router();
    stops.push(listenToLocation());
    holdAll();
    document.body.innerHTML = '<a href="/projects">Projects</a>';

    document.querySelector('a')?.click();
    expect(location.pathname).toBe('/agents/new');

    held?.();
    expect(location.pathname).toBe('/projects');
  });

  it('puts the page back after a held back button, and opens the target when the page lets it go', () => {
    router();
    stops.push(listenToLocation());
    holdAll();

    history.replaceState(null, '', '/agents');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(window.location.pathname).toBe('/agents/new');
    expect(location.pathname).toBe('/agents/new');

    held?.();
    expect(window.location.pathname).toBe('/agents');
    expect(location.pathname).toBe('/agents');
  });
});
