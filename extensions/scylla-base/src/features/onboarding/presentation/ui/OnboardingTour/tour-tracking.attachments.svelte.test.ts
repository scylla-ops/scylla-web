import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync, untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { dialogHoldStore } from '@scylla/ui/stores';
import type { TourAnchor, TourSpotStep } from './tour-steps.registry.ts';
import {
  HOLD_MS,
  LOST_AFTER_MS,
  LOST_LIMIT_MS,
  MOVE_MS,
  blockPage,
  holdDialogs,
  holdKeyboard,
  markTourActive,
  measure,
  tourFocusables,
  trackTourStep,
  type TourKeyboard,
  type TourTracking,
} from './tour-tracking.attachments.svelte.ts';

const byId =
  (id: string): TourAnchor =>
  root =>
    root.querySelector(`#${id}`);

const step = (overrides: Partial<TourSpotStep>): TourSpotStep => ({
  id: 'step',
  title: { id: 'title' },
  body: [],
  targets: [byId('target')],
  advance: { on: 'next' },
  ...overrides,
});

/** Runs an attachment the way a template does: in an effect, with its options as state. */
const attach = <T>(
  make: (options: () => T) => Attachment<HTMLElement>,
  node: HTMLElement,
  initial: T,
) => {
  let options = $state.raw(initial);
  const stop = $effect.root(() => {
    $effect(() => untrack(() => make(() => options)(node)));
  });
  flushSync();
  return {
    update: (next: T) => {
      options = next;
      flushSync();
    },
    destroy: stop,
  };
};

const track = (overrides: Partial<TourSpotStep>, rewound = false, isLoading = () => false) => {
  const tracking: TourTracking = {
    step: step(overrides),
    subject: {},
    rewound,
    onLayout: vi.fn(),
    onAction: vi.fn(),
    onAdvance: vi.fn(),
    onUnlock: vi.fn(),
    onLock: vi.fn(),
    onLost: vi.fn(),
    onFound: vi.fn(),
    onHint: vi.fn(),
    isLoading,
  };
  const handle = attach(trackTourStep, document.createElement('div'), tracking);
  return {
    tracking,
    moveTo: (overrides: Partial<TourSpotStep>) =>
      handle.update({ ...tracking, step: step(overrides) }),
    destroy: handle.destroy,
  };
};

const box = (element: HTMLElement | null, rect: DOMRect, layout = rect) => {
  if (!element) throw new Error('no element');
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: layout.width });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: layout.height });
};

const frames = (ms: number) => vi.advanceTimersByTime(ms);

const NO_TARGET = { targets: [null], final: [null], allowed: null, avoid: [], moving: false };

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

  it('after Previous, waits for the element to go before it moves on again', () => {
    document.body.innerHTML = '<div id="late"></div>';
    const { tracking, destroy } = track({ advance: { on: 'appear', anchor: byId('late') } }, true);

    frames(100);
    expect(tracking.onAdvance).not.toHaveBeenCalled();

    document.body.innerHTML = '';
    frames(100);
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

  it('locks Next again when the awaited element goes away', () => {
    document.body.innerHTML = '<div id="filled"></div>';
    const { tracking, destroy } = track({ nextWhen: { on: 'appear', anchor: byId('filled') } });
    frames(50);
    expect(tracking.onUnlock).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    frames(50);
    expect(tracking.onLock).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '<div id="filled"></div>';
    frames(50);
    expect(tracking.onUnlock).toHaveBeenCalledTimes(2);
    destroy();
  });

  it('moves on when a dialog that showed goes away, not while it never showed', () => {
    const { tracking, destroy } = track({ advance: { on: 'gone', anchor: byId('dialog') } });
    frames(100);
    expect(tracking.onAdvance).not.toHaveBeenCalled();

    document.body.innerHTML = '<div id="dialog"></div>';
    frames(100);
    expect(tracking.onAdvance).not.toHaveBeenCalled();

    document.body.innerHTML = '';
    frames(100);
    expect(tracking.onAdvance).toHaveBeenCalledTimes(1);
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

  it('does not take a page that still loads for a lost step', () => {
    let loading = true;
    const { tracking, destroy } = track({}, false, () => loading);

    frames(LOST_AFTER_MS + 500);
    expect(tracking.onLost).not.toHaveBeenCalled();

    loading = false;
    frames(LOST_AFTER_MS - 100);
    expect(tracking.onLost).not.toHaveBeenCalled();
    frames(200);
    expect(tracking.onLost).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('keeps the time without a request when a poll starts and ends', () => {
    let loading = false;
    const { tracking, destroy } = track({}, false, () => loading);

    frames(LOST_AFTER_MS - 500);
    loading = true;
    frames(300);
    loading = false;
    frames(600);

    expect(tracking.onLost).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('gives up on a request that hangs', () => {
    const { tracking, destroy } = track({}, false, () => true);

    frames(LOST_LIMIT_MS - 100);
    expect(tracking.onLost).not.toHaveBeenCalled();

    frames(200);
    expect(tracking.onLost).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('is found again when the target comes back', () => {
    const { tracking, destroy } = track({});
    frames(LOST_AFTER_MS + 100);

    document.body.innerHTML = '<div id="target"></div>';
    box(document.getElementById('target'), new DOMRect(10, 20, 100, 40));
    frames(50);

    expect(tracking.onFound).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('starts the count again on a new page, so that the fallback can work there', () => {
    const { tracking, destroy } = track({});
    frames(LOST_AFTER_MS + 100);
    expect(tracking.onLost).toHaveBeenCalledTimes(1);

    window.history.pushState({}, '', '/acme/other');
    frames(50);
    expect(tracking.onFound).toHaveBeenCalledTimes(1);

    frames(LOST_AFTER_MS + 100);
    expect(tracking.onLost).toHaveBeenCalledTimes(2);
    window.history.pushState({}, '', '/');
    destroy();
  });

  it('reports the layout of the targets, and again when the page changes', () => {
    const { tracking, destroy } = track({});

    frames(50);
    expect(tracking.onLayout).toHaveBeenLastCalledWith(NO_TARGET);

    document.body.innerHTML = '<div id="target"></div>';
    box(document.getElementById('target'), new DOMRect(10, 20, 100, 40));
    frames(50);
    const spot = { x: 2, y: 12, width: 116, height: 56 };
    expect(tracking.onLayout).toHaveBeenLastCalledWith({
      targets: [spot],
      final: [spot],
      allowed: null,
      avoid: [],
      moving: false,
    });
    expect(tracking.onLayout).toHaveBeenCalledTimes(2);
    destroy();
  });

  it('keeps the spot inside the scroller of the target', () => {
    document.body.innerHTML =
      '<div id="scroller" style="overflow-y: auto"><div id="target"></div></div>';
    box(document.getElementById('scroller'), new DOMRect(200, 64, 800, 700));
    box(document.getElementById('target'), new DOMRect(300, 40, 100, 100));
    const { tracking, destroy } = track({});

    frames(50);

    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].final[0]).toEqual({
      x: 292,
      y: 64,
      width: 116,
      height: 84,
    });
    destroy();
  });

  it('reports the open menus, which the card must not cover', () => {
    document.body.innerHTML = '<div id="target"></div><div role="menu" id="menu"></div>';
    box(document.getElementById('target'), new DOMRect(10, 20, 100, 40));
    box(document.getElementById('menu'), new DOMRect(300, 20, 200, 300));
    const { tracking, destroy } = track({});

    frames(50);

    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].avoid).toEqual([
      { x: 300, y: 20, width: 200, height: 300 },
    ]);
    destroy();
  });

  it('reports the part of the target that the card must stay off', () => {
    document.body.innerHTML = '<div id="target"><input id="name" /></div>';
    box(document.getElementById('target'), new DOMRect(10, 20, 100, 40));
    box(document.getElementById('name'), new DOMRect(20, 30, 50, 20));
    const { tracking, destroy } = track({ keepClear: byId('name') });

    frames(50);

    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].avoid).toEqual([
      { x: 20, y: 30, width: 50, height: 20 },
    ]);
    destroy();
  });

  it('scrolls by the real box of the target, not by the ring that still moves', () => {
    document.body.innerHTML = '<div id="target"></div><div id="next"></div>';
    box(document.getElementById('target'), new DOMRect(0, 2000, 100, 40));
    const next = document.getElementById('next') as HTMLElement;
    box(next, new DOMRect(400, 200, 100, 40));
    const scroll = vi.spyOn(next, 'scrollIntoView');
    const { moveTo, destroy } = track({});
    frames(50);
    scroll.mockClear();

    moveTo({ id: 'second', targets: [byId('next')] });
    frames(50);

    expect(scroll).not.toHaveBeenCalled();
    destroy();
  });

  it('shows a target taller than the screen from its top', () => {
    document.body.innerHTML = '<div id="target"></div>';
    const target = document.getElementById('target') as HTMLElement;
    box(target, new DOMRect(0, -500, 100, 3000));
    const scroll = vi.spyOn(target, 'scrollIntoView');
    const { destroy } = track({});

    frames(50);

    expect(scroll).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
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

  it('sends the card to the end of the move while the ring glides there', () => {
    document.body.innerHTML = '<div id="target"></div><div id="next"></div>';
    box(document.getElementById('target'), new DOMRect(0, 0, 100, 40));
    box(document.getElementById('next'), new DOMRect(400, 200, 100, 40));
    const { tracking, moveTo, destroy } = track({});
    frames(50);

    moveTo({ id: 'second', targets: [byId('next')] });
    frames(MOVE_MS / 2);
    const middle = vi.mocked(tracking.onLayout).mock.lastCall![0];
    expect(middle.moving).toBe(true);
    expect(middle.final[0]).toEqual({ x: 392, y: 192, width: 116, height: 56 });
    expect(middle.targets[0]!.x).toBeLessThan(392);

    frames(MOVE_MS);
    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].moving).toBe(false);
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
    expect(halfway!.x).toBeGreaterThan(2);
    expect(halfway!.x).toBeLessThan(392);

    frames(MOVE_MS);
    expect(vi.mocked(tracking.onLayout).mock.lastCall![0].targets[0]).toEqual({
      x: 392,
      y: 192,
      width: 116,
      height: 56,
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
    expect(tracking.onLayout).toHaveBeenLastCalledWith(NO_TARGET);
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

    const handle = attach(blockPage, tour, { active: true, allowed: () => null });

    expect(document.getElementById('page')).toHaveAttribute('inert');
    expect(document.getElementById('dialog')).toHaveAttribute('inert');
    expect(tour).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(tour.querySelector('[data-tour-focus]'));
    handle.destroy();
  });

  it('keeps usable the part of the page that holds the allowed element', () => {
    const tour = setUpPage();

    const handle = attach(blockPage, tour, {
      active: true,
      allowed: () => document.getElementById('copy'),
    });

    expect(document.getElementById('page')).toHaveAttribute('inert');
    expect(document.getElementById('dialog')).not.toHaveAttribute('inert');
    handle.destroy();
  });

  it('gives the page back when the step stops blocking, and when the tour goes away', () => {
    const tour = setUpPage();
    const handle = attach(blockPage, tour, { active: true, allowed: () => null });

    handle.update({ active: false, allowed: () => null });
    expect(document.getElementById('page')).not.toHaveAttribute('inert');

    handle.update({ active: true, allowed: () => null });
    handle.destroy();
    expect(document.getElementById('page')).not.toHaveAttribute('inert');
  });

  it('blocks a dialog that opens while the step blocks the page', async () => {
    const tour = setUpPage();
    const handle = attach(blockPage, tour, { active: true, allowed: () => null });

    const late = document.createElement('div');
    document.body.appendChild(late);
    await Promise.resolve();

    expect(late).toHaveAttribute('inert');
    handle.destroy();
  });
});

describe('holdDialogs', () => {
  it('holds the dialogs while the step asks for it, and lets them go with the tour', () => {
    const handle = attach(holdDialogs, document.createElement('div'), true);
    expect(dialogHoldStore.getState().held).toBe(true);

    handle.destroy();
    expect(dialogHoldStore.getState().held).toBe(false);
  });
});

describe('markTourActive', () => {
  it('marks the document while the tour shows', () => {
    const node = document.createElement('div');
    const stop = $effect.root(() => {
      $effect(() => untrack(() => markTourActive(node)));
    });
    flushSync();
    expect(document.documentElement).toHaveAttribute('data-tour-active');

    stop();
    expect(document.documentElement).not.toHaveAttribute('data-tour-active');
  });
});

describe('holdKeyboard', () => {
  const setUp = (overrides: Partial<TourKeyboard> = {}) => {
    document.body.innerHTML = `
      <button id="behind">behind</button>
      <div id="target"><input id="field" /><button id="create">Create</button></div>
      <div id="tour"><div data-tour-focus tabindex="-1"><button id="skip">Skip</button></div></div>`;
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 10, 10),
    ] as unknown as DOMRectList);
    const options: TourKeyboard = {
      holdSearch: true,
      loopTab: true,
      targets: () => [document.getElementById('target')],
      ...overrides,
    };
    return attach(holdKeyboard, document.getElementById('tour') as HTMLElement, options);
  };

  const press = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event;
  };

  const focusOn = (id: string) => document.getElementById(id)?.focus();

  afterEach(() => vi.restoreAllMocks());

  it('stops the search shortcut, which would open over the step', () => {
    const handle = setUp();
    const heard = vi.fn();
    window.addEventListener('keydown', heard);

    const event = press({ key: 'k', metaKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener('keydown', heard);
    handle.destroy();
  });

  it('leaves the search shortcut alone on a lost card', () => {
    const handle = setUp({ holdSearch: false, loopTab: false });
    const event = press({ key: 'k', ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    handle.destroy();
  });

  it('takes Tab around the targets and the card, and never behind the dim', () => {
    const handle = setUp();
    focusOn('field');

    press({ key: 'Tab' });
    expect(document.activeElement?.id).toBe('create');
    press({ key: 'Tab' });
    expect(document.activeElement?.id).toBe('skip');
    press({ key: 'Tab' });
    expect(document.activeElement?.id).toBe('field');
    press({ key: 'Tab', shiftKey: true });
    expect(document.activeElement?.id).toBe('skip');
    handle.destroy();
  });

  it('brings a focus from behind the dim back to the tour', () => {
    const handle = setUp();
    focusOn('behind');

    press({ key: 'Tab' });

    expect(document.activeElement?.id).toBe('field');
    handle.destroy();
  });

  it('leaves Tab to the skip confirmation', () => {
    const handle = setUp({ loopTab: false });
    focusOn('field');

    const event = press({ key: 'Tab' });

    expect(event.defaultPrevented).toBe(false);
    handle.destroy();
  });

  it('leaves Tab to an open menu', () => {
    const handle = setUp();
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<button id="item">Run</button>';
    document.body.appendChild(menu);
    focusOn('item');

    const event = press({ key: 'Tab' });

    expect(event.defaultPrevented).toBe(false);
    handle.destroy();
  });

  it('skips what cannot take the focus', () => {
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 10, 10),
    ] as unknown as DOMRectList);
    document.body.innerHTML = `
      <div id="root"><button id="ok"></button><button disabled></button>
        <div inert><button></button></div></div>`;

    const list = tourFocusables([document.getElementById('root') as HTMLElement]);

    expect(list.map(element => element.id)).toEqual(['ok']);
  });
});
