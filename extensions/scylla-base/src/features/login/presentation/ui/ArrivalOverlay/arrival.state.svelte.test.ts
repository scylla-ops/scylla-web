import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withQueryClient } from '@test/render.ts';
import { ARRIVAL_MS, MARKER_MAX_MS, QUIET_MS, arrival } from './arrival.state.svelte.ts';

const media = (matching: readonly string[]) =>
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches: matching.includes(query),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

const WIDE = '(min-width: 64rem)';
const REDUCED = '(prefers-reduced-motion: reduce)';

/** The answer of the server is at 0: the curtain covers the screen at `light + curtain`. */
const STAGE_AT = ARRIVAL_MS.light + ARRIVAL_MS.curtain;

let cache: ReturnType<typeof withQueryClient>;

const showPage = () => document.body.append(document.createElement('main'));

beforeEach(() => {
  vi.useFakeTimers();
  cache = withQueryClient();
  media([WIDE]);
});

afterEach(() => {
  arrival.reset();
  cache.restore();
  document.body.replaceChildren();
  sessionStorage.clear();
  history.replaceState(null, '', '/');
  vi.useRealTimers();
});

describe('arrival', () => {
  it('lights the dots, closes the curtain, then opens the app under the full panel', () => {
    const go = vi.fn();

    arrival.begin(go);

    expect(arrival.mode).toBe('curtain');
    expect(arrival.phase).toBe('lit');
    expect(arrival.covers).toBe(false);
    vi.advanceTimersByTime(ARRIVAL_MS.light);
    expect(arrival.phase).toBe('cover');
    expect(arrival.formLeaves).toBe(true);
    expect(go).not.toHaveBeenCalled();
    vi.advanceTimersByTime(ARRIVAL_MS.curtain);
    expect(arrival.phase).toBe('stage');
    expect(go).toHaveBeenCalledOnce();
  });

  it('holds the stage at least 150 ms, then lands once the page shows and its queries end', () => {
    arrival.begin(() => showPage());

    vi.advanceTimersByTime(STAGE_AT + ARRIVAL_MS.stageMin - 1);
    expect(arrival.phase).toBe('stage');
    vi.advanceTimersByTime(QUIET_MS);
    expect(arrival.phase).toBe('landing');
    expect(arrival.hidesBrand).toBe(true);
    vi.advanceTimersByTime(ARRIVAL_MS.landing);
    expect(arrival.phase).toBe('arrived');
    expect(arrival.hidesBrand).toBe(false);
    vi.advanceTimersByTime(ARRIVAL_MS.wordmark);
    expect(arrival.phase).toBe('idle');
  });

  it('holds the stage while a query of the page runs', async () => {
    let answer: (value: string) => void = () => undefined;
    void cache.queryClient.fetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => new Promise<string>(resolve => (answer = resolve)),
    });
    arrival.begin(() => showPage());

    await vi.advanceTimersByTimeAsync(STAGE_AT + 1000);
    expect(arrival.phase).toBe('stage');

    answer('ready');
    await vi.advanceTimersByTimeAsync(QUIET_MS + 50);
    expect(arrival.phase).toBe('landing');
  });

  it('lands after 3 s when the page does not show', () => {
    arrival.begin(() => undefined);

    vi.advanceTimersByTime(STAGE_AT + ARRIVAL_MS.waitMax - 100);
    expect(arrival.phase).toBe('stage');
    vi.advanceTimersByTime(100);
    expect(arrival.phase).toBe('landing');
  });

  it('fades instead with reduced motion: no curtain, and the logo of the shell stays', () => {
    media([WIDE, REDUCED]);
    const go = vi.fn(showPage);

    arrival.begin(go);

    expect(arrival.mode).toBe('fade');
    vi.advanceTimersByTime(ARRIVAL_MS.fade);
    expect(arrival.phase).toBe('cover');
    expect(arrival.formLeaves).toBe(false);
    expect(arrival.hidesBrand).toBe(false);
    vi.advanceTimersByTime(ARRIVAL_MS.fade);
    expect(go).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(ARRIVAL_MS.stageMin + QUIET_MS);
    expect(arrival.phase).toBe('idle');
  });

  it('fades below lg, where the sign-in page has no panel', () => {
    media([]);

    arrival.begin(() => undefined);

    expect(arrival.mode).toBe('fade');
  });

  it('starts again from the beginning on a second sign-in', () => {
    const first = vi.fn();
    const second = vi.fn();

    arrival.begin(first);
    vi.advanceTimersByTime(ARRIVAL_MS.light);
    arrival.begin(second);
    vi.advanceTimersByTime(STAGE_AT);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('gives the box of the logo of the shell that shows', () => {
    const hidden = document.createElement('img');
    const shown = document.createElement('img');
    const box = new DOMRect(73, 16, 109, 36);
    shown.getBoundingClientRect = () => box;
    const stopHidden = arrival.target(hidden);
    const stopShown = arrival.target(shown);

    expect(arrival.targetBox).toBe(box);

    if (typeof stopShown === 'function') stopShown();
    expect(arrival.targetBox).toBeNull();
    if (typeof stopHidden === 'function') stopHidden();
  });
});

describe('the arrival after a sign-in with a provider', () => {
  const MARKER = 'scylla.sign-in-arrival';
  const click = (init: MouseEventInit = {}) => new MouseEvent('click', { button: 0, ...init });
  const leaveFor = (returnPath: string) => arrival.leave(click(), returnPath);

  /** The provider sends the tab back to `url`, and the app starts. */
  const startAt = (url: string) => {
    history.replaceState(null, '', url);
    arrival.reset();
    arrival.comeBack();
  };

  it('keeps the return path in the tab, and the dots wait until the tab leaves', () => {
    leaveFor('/acme/projects');

    expect(arrival.leaving).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(MARKER) ?? 'null')).toEqual({
      at: Date.now(),
      to: '/acme/projects',
    });
  });

  it.each([
    ['with Ctrl', { ctrlKey: true }],
    ['with Cmd', { metaKey: true }],
    ['with Shift', { shiftKey: true }],
    ['with the middle button', { button: 1 }],
  ])('stays on the page for a click %s, which opens another tab', (_case, init) => {
    arrival.leave(click(init), '/');

    expect(arrival.leaving).toBe(false);
    expect(sessionStorage.getItem(MARKER)).toBeNull();
  });

  it('stops the wait when the back button shows the page from the cache of the browser', () => {
    leaveFor('/');

    arrival.pageShown(new PageTransitionEvent('pageshow', { persisted: true }));

    expect(arrival.leaving).toBe(false);
    expect(sessionStorage.getItem(MARKER)).toBeNull();
  });

  it('hides the app from the start, lights the dots, then closes the curtain and lands', () => {
    leaveFor('/');

    startAt('/');

    expect(sessionStorage.getItem(MARKER)).toBeNull();
    expect(arrival.phase).toBe('back');
    expect(arrival.hidesApp).toBe(true);
    expect(arrival.covers).toBe(false);
    vi.advanceTimersByTime(ARRIVAL_MS.back);
    expect(arrival.phase).toBe('lit');
    vi.advanceTimersByTime(ARRIVAL_MS.light);
    expect(arrival.phase).toBe('cover');
    expect(arrival.covers).toBe(true);
    expect(arrival.hidesApp).toBe(true);
    vi.advanceTimersByTime(ARRIVAL_MS.curtain);
    expect(arrival.phase).toBe('stage');
    expect(arrival.hidesApp).toBe(false);
    showPage();
    vi.advanceTimersByTime(ARRIVAL_MS.stageMin + QUIET_MS);
    expect(arrival.phase).toBe('landing');
  });

  it('plays on a deep return path, with its query and its fragment', () => {
    leaveFor('/acme/projects/p-1?tab=runs#latest');

    startAt('/acme/projects/p-1?tab=runs#latest');

    expect(arrival.phase).toBe('back');
  });

  it('covers the app with the veil from the start below lg, and fades it out once it shows', () => {
    media([]);
    leaveFor('/');

    startAt('/');

    expect(arrival.mode).toBe('fade');
    expect(arrival.phase).toBe('stage');
    expect(arrival.covers).toBe(true);
    expect(arrival.hidesApp).toBe(false);
    showPage();
    vi.advanceTimersByTime(ARRIVAL_MS.stageMin + QUIET_MS);
    expect(arrival.phase).toBe('idle');
  });

  it('covers the app with the veil from the start with reduced motion', () => {
    media([WIDE, REDUCED]);
    leaveFor('/');

    startAt('/');

    expect(arrival.mode).toBe('fade');
    expect(arrival.phase).toBe('stage');
  });

  it.each([
    ['the page of a failed sign-in', '/sign-in-error?code=access_denied&provider=github'],
    ['the sign-in page, after the back button', '/login'],
    ['the page that waits for a password', '/sign-in-link'],
  ])('plays nothing on %s, and forgets the marker', (_case, url) => {
    leaveFor('/');

    startAt(url);

    expect(arrival.phase).toBe('idle');
    expect(arrival.hidesApp).toBe(false);
    expect(sessionStorage.getItem(MARKER)).toBeNull();
  });

  it('plays nothing for a marker older than a sign-in with a provider can be', () => {
    leaveFor('/');
    vi.advanceTimersByTime(MARKER_MAX_MS + 1);

    startAt('/');

    expect(arrival.phase).toBe('idle');
    expect(sessionStorage.getItem(MARKER)).toBeNull();
  });

  it('plays nothing on a start with no marker, or with a marker that is not one', () => {
    startAt('/');
    expect(arrival.phase).toBe('idle');

    sessionStorage.setItem(MARKER, '{"to": 1}');
    startAt('/');
    expect(arrival.phase).toBe('idle');
    expect(sessionStorage.getItem(MARKER)).toBeNull();
  });
});
