import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TourAnchor, TourSpotStep } from '../tour-steps.ts';
import {
  HOLD_MS,
  LOST_AFTER_MS,
  MOVE_MS,
  blockPage,
  measure,
  trackTourStep,
  type TourTracking,
} from '../tour-tracking.actions.ts';

const byId =
  (id: string): TourAnchor =>
  root =>
    root.querySelector(`#${id}`);

const step = (overrides: Partial<TourSpotStep>): TourSpotStep => ({
  kind: 'spot',
  id: 'step',
  title: { id: 'title' },
  body: [],
  targets: [byId('target')],
  advance: { on: 'next' },
  ...overrides,
});

const track = (overrides: Partial<TourSpotStep>) => {
  const tracking: TourTracking = {
    step: step(overrides),
    subject: {},
    onLayout: vi.fn(),
    onAdvance: vi.fn(),
    onUnlock: vi.fn(),
    onLost: vi.fn(),
    onHint: vi.fn(),
  };
  const handle = trackTourStep(document.createElement('div'), tracking);
  return {
    tracking,
    moveTo: (overrides: Partial<TourSpotStep>) =>
      handle?.update?.({ ...tracking, step: step(overrides) }),
    destroy: () => handle?.destroy?.(),
  };
};

const box = (element: HTMLElement | null, rect: DOMRect, layout = rect) => {
  if (!element) throw new Error('no element');
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: layout.width });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: layout.height });
};

const frames = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('trackTourStep', () => {
  it('moves on when the user clicks inside the target', () => {
    document.body.innerHTML =
      '<div id="target"><button id="inner">Go</button></div><button id="away">x</button>';
    const { tracking, destroy } = track({ advance: { on: 'click', anchor: byId('target') } });

    document.getElementById('away')?.click();
    expect(tracking.onAdvance).not.toHaveBeenCalled();

    document.getElementById('inner')?.click();
    expect(tracking.onAdvance).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('moves on once when a late element appears', () => {
    const { tracking, destroy } = track({ advance: { on: 'appear', anchor: byId('late') } });

    frames(100);
    expect(tracking.onAdvance).not.toHaveBeenCalled();

    document.body.innerHTML = '<div id="late"></div>';
    frames(100);
    expect(tracking.onAdvance).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('unlocks Next after the click the step waits for', () => {
    document.body.innerHTML = '<div id="target"><button id="copy">Copy</button></div>';
    const { tracking, destroy } = track({ nextWhen: { on: 'click', anchor: byId('copy') } });

    document.getElementById('copy')?.click();

    expect(tracking.onUnlock).toHaveBeenCalledTimes(1);
    expect(tracking.onAdvance).not.toHaveBeenCalled();
    destroy();
  });

  it('unlocks Next when the awaited element appears, without moving on', () => {
    const { tracking, destroy } = track({ nextWhen: { on: 'appear', anchor: byId('online') } });

    frames(100);
    expect(tracking.onUnlock).not.toHaveBeenCalled();

    document.body.innerHTML = '<div id="online"></div>';
    frames(100);
    expect(tracking.onUnlock).toHaveBeenCalledTimes(1);
    expect(tracking.onAdvance).not.toHaveBeenCalled();
    destroy();
  });

  it('reports the step as lost when its target never shows, instead of waiting forever', () => {
    const { tracking, destroy } = track({});

    frames(LOST_AFTER_MS - 100);
    expect(tracking.onLost).not.toHaveBeenCalled();

    frames(200);
    expect(tracking.onLost).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('reports the layout of the targets, and again when the page changes', () => {
    const { tracking, destroy } = track({});

    frames(50);
    expect(tracking.onLayout).toHaveBeenLastCalledWith({ targets: [null], allowed: null });

    document.body.innerHTML = '<div id="target"></div>';
    box(document.getElementById('target'), new DOMRect(10, 20, 100, 40));
    frames(50);
    expect(tracking.onLayout).toHaveBeenLastCalledWith({
      targets: [{ x: 10, y: 20, width: 100, height: 40 }],
      allowed: null,
    });
    expect(tracking.onLayout).toHaveBeenCalledTimes(2);
    destroy();
  });

  it('stops listening once destroyed', () => {
    document.body.innerHTML = '<div id="target"></div>';
    const { tracking, destroy } = track({ advance: { on: 'click', anchor: byId('target') } });

    destroy();
    document.getElementById('target')?.click();

    expect(tracking.onAdvance).not.toHaveBeenCalled();
  });

  it('shows the hint only once its condition still holds after the delay, and hides it again', () => {
    document.body.innerHTML = '<div id="pending"></div>';
    const { tracking, destroy } = track({
      hint: { body: [], when: byId('pending'), afterMs: 5000 },
    });

    frames(4900);
    expect(tracking.onHint).not.toHaveBeenCalled();

    frames(200);
    expect(tracking.onHint).toHaveBeenLastCalledWith(true);

    document.body.innerHTML = '';
    frames(50);
    expect(tracking.onHint).toHaveBeenLastCalledWith(false);
    destroy();
  });

  it('never shows the hint when the job starts within the delay', () => {
    document.body.innerHTML = '<div id="pending"></div>';
    const { tracking, destroy } = track({
      hint: { body: [], when: byId('pending'), afterMs: 5000 },
    });

    frames(3000);
    document.body.innerHTML = '';
    frames(5000);

    expect(tracking.onHint).not.toHaveBeenCalled();
    destroy();
  });

  it('glides from the previous target to the next one instead of jumping', () => {
    document.body.innerHTML = '<div id="target"></div><div id="next"></div>';
    box(document.getElementById('target'), new DOMRect(0, 0, 100, 40));
    box(document.getElementById('next'), new DOMRect(400, 200, 100, 40));
    const { tracking, moveTo, destroy } = track({});
    frames(50);

    moveTo({ id: 'second', targets: [byId('next')] });
    frames(MOVE_MS / 2);
    const [halfway] = vi.mocked(tracking.onLayout).mock.lastCall![0].targets;
    expect(halfway!.x).toBeGreaterThan(0);
    expect(halfway!.x).toBeLessThan(400);

    frames(MOVE_MS);
    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].targets[0]).toEqual({
      x: 400,
      y: 200,
      width: 100,
      height: 40,
    });
    destroy();
  });

  it('keeps the previous spot for a moment while the next page loads', () => {
    document.body.innerHTML = '<div id="target"></div>';
    box(document.getElementById('target'), new DOMRect(0, 0, 100, 40));
    const { tracking, moveTo, destroy } = track({});
    frames(50);
    const calls = vi.mocked(tracking.onLayout).mock.calls.length;

    moveTo({ id: 'second', targets: [byId('late')] });
    frames(HOLD_MS - 100);
    expect(tracking.onLayout).toHaveBeenCalledTimes(calls);

    frames(200);
    expect(tracking.onLayout).toHaveBeenLastCalledWith({ targets: [null], allowed: null });
    destroy();
  });
});

describe('measure', () => {
  it('ignores a hover scale: the spotlight keeps the layout box', () => {
    document.body.innerHTML = '<button id="grow">New</button>';
    const button = document.getElementById('grow');
    box(button, new DOMRect(95, 48, 110, 44), new DOMRect(100, 50, 100, 40));

    expect(measure(button!)).toEqual({ x: 100, y: 50, width: 100, height: 40 });
  });

  it('boxes the children of a display: contents wrapper', () => {
    document.body.innerHTML = '<span id="wrap"><button id="a"></button></span>';
    box(document.getElementById('wrap'), new DOMRect(0, 0, 0, 0));
    box(document.getElementById('a'), new DOMRect(10, 10, 32, 32));

    expect(measure(document.getElementById('wrap')!)).toEqual({
      x: 10,
      y: 10,
      width: 32,
      height: 32,
    });
  });
});

describe('blockPage', () => {
  const setUpPage = () => {
    document.body.innerHTML =
      '<main id="page"><button>page</button></main><div id="dialog"><button id="copy">copy</button></div>';
    const tour = document.createElement('div');
    tour.innerHTML = '<div data-tour-focus tabindex="-1"></div>';
    document.body.appendChild(tour);
    return tour;
  };

  it('makes the rest of the page inert and moves the focus to the tour', () => {
    const tour = setUpPage();

    const handle = blockPage(tour, { active: true, allowed: () => null });

    expect(document.getElementById('page')).toHaveAttribute('inert');
    expect(document.getElementById('dialog')).toHaveAttribute('inert');
    expect(tour).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(tour.querySelector('[data-tour-focus]'));
    handle?.destroy?.();
  });

  it('keeps usable the part of the page that holds the allowed element', () => {
    const tour = setUpPage();

    const handle = blockPage(tour, {
      active: true,
      allowed: () => document.getElementById('copy'),
    });

    expect(document.getElementById('page')).toHaveAttribute('inert');
    expect(document.getElementById('dialog')).not.toHaveAttribute('inert');
    handle?.destroy?.();
  });

  it('gives the page back when the step stops blocking, and when the tour goes away', () => {
    const tour = setUpPage();
    const handle = blockPage(tour, { active: true, allowed: () => null });

    handle?.update?.({ active: false, allowed: () => null });
    expect(document.getElementById('page')).not.toHaveAttribute('inert');

    handle?.update?.({ active: true, allowed: () => null });
    handle?.destroy?.();
    expect(document.getElementById('page')).not.toHaveAttribute('inert');
  });

  it('blocks a dialog that opens while the step blocks the page', async () => {
    const tour = setUpPage();
    const handle = blockPage(tour, { active: true, allowed: () => null });

    const late = document.createElement('div');
    document.body.appendChild(late);
    await Promise.resolve();

    expect(late).toHaveAttribute('inert');
    handle?.destroy?.();
  });
});
