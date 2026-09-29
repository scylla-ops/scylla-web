import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TourAnchor, TourSpotStep } from '../tour-steps.ts';
import { LOST_AFTER_MS, trackTourStep, type TourTracking } from '../tour-tracking.actions.ts';

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
  };
  const handle = trackTourStep(document.createElement('div'), tracking);
  return { tracking, destroy: () => handle?.destroy?.() };
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
    expect(tracking.onLayout).toHaveBeenLastCalledWith([null]);

    document.body.innerHTML = '<div id="target"></div>';
    const target = document.getElementById('target')!;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 100, 40));
    frames(50);
    expect(tracking.onLayout).toHaveBeenLastCalledWith([{ x: 10, y: 20, width: 100, height: 40 }]);
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
});
