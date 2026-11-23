import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync, untrack } from 'svelte';
import { arrive, closeCurtain, lockupMark, rowsOf } from './arrival.attachments.svelte.ts';

const boxed = (tag: string, box: DOMRect, attributes: Record<string, string> = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  element.getBoundingClientRect = () => box;
  return element;
};

/** The overlay as `ArrivalOverlay` draws it, after the page of the app. */
const overlayAfterPage = () => {
  const page = document.createElement('div');
  const main = document.createElement('main');
  const widgets = [100, 100, 214].map(top =>
    boxed('section', new DOMRect(0, top, 268, 98), { 'data-slot': 'widget' }),
  );
  main.append(...widgets);
  page.append(main);
  const overlay = boxed('div', new DOMRect(0, 0, 1440, 900));
  overlay.innerHTML = `
    <div data-part="arrival-panel"><span data-part="arrival-separator"></span></div>
    <div data-part="arrival-flight"></div>`;
  const mark = boxed('img', new DOMRect(580, 310, 280, 280), { 'data-part': 'arrival-mark' });
  overlay.querySelector('[data-part="arrival-flight"]')?.append(mark);
  document.body.append(page, overlay);
  return { page, overlay, widgets, mark };
};

const keyframesOf = (element: Element | null) =>
  vi
    .mocked(Element.prototype.animate)
    .mock.contexts.flatMap((context, index) =>
      context === element ? [vi.mocked(Element.prototype.animate).mock.calls[index]] : [],
    );

afterEach(() => document.body.replaceChildren());

describe('lockupMark', () => {
  it('finds the mark in the left square of the lockup', () => {
    const mark = lockupMark(new DOMRect(73, 16, 109.5, 36));

    expect(mark.size).toBeCloseTo(17.88, 2);
    expect(mark.centerX).toBeCloseTo(73 + 8.94, 2);
    expect(mark.centerY).toBeCloseTo(16 + 20.92, 2);
  });
});

describe('rowsOf', () => {
  it('groups the elements of the view by their top, from the top', () => {
    const lower = boxed('div', new DOMRect(0, 300, 10, 10));
    const left = boxed('div', new DOMRect(0, 100, 10, 10));
    const right = boxed('div', new DOMRect(20, 100.3, 10, 10));
    const below = boxed('div', new DOMRect(0, window.innerHeight + 10, 10, 10));

    expect(rowsOf([lower, left, right, below])).toEqual([[left, right], [lower]]);
  });
});

describe('closeCurtain', () => {
  it('grows the panel to the full width, with the mark at its center', () => {
    const { overlay, mark } = overlayAfterPage();

    closeCurtain(overlay);

    const panel = overlay.querySelector('[data-part="arrival-panel"]');
    expect(keyframesOf(panel)[0]?.[0]).toEqual([{ width: '40%' }, { width: '100%' }]);
    expect(keyframesOf(mark)[0]?.[0]).toEqual([{ left: '288px' }, { left: '720px' }]);
  });

  it('keeps the mark in place when the shell, which has no scrollbar gutter, opens under the panel', () => {
    const { overlay, mark } = overlayAfterPage();
    // The sign-in page keeps a gutter of 10 px for its scrollbar.
    overlay.getBoundingClientRect = () => new DOMRect(0, 0, 1430, 900);

    closeCurtain(overlay);
    overlay.getBoundingClientRect = () => new DOMRect(0, 0, 1440, 900);

    expect(keyframesOf(mark)[0]?.[0]).toEqual([{ left: '286px' }, { left: '715px' }]);
  });
});

describe('arrive', () => {
  const land = (overlay: HTMLElement, target: DOMRect | null) => {
    let landing = $state(false);
    const stop = $effect.root(() => {
      $effect(() =>
        untrack(() =>
          arrive(
            () => landing,
            () => target,
          )(overlay),
        ),
      );
    });
    flushSync();
    const curtain = vi.mocked(Element.prototype.animate).mock.results.map(
      ({ value }) => value as Animation,
    );
    landing = true;
    flushSync();
    return { stop, curtain };
  };

  it('ends the curtain before the flight, which leaves from the center', () => {
    const { overlay } = overlayAfterPage();

    const { stop, curtain } = land(overlay, new DOMRect(73, 16, 109.5, 36));

    expect(curtain).toHaveLength(3);
    expect(curtain.map(animation => animation.playState)).toEqual([
      'finished',
      'finished',
      'finished',
    ]);
    stop();
  });

  it('flies the mark onto the mark of the logo of the shell', () => {
    const { overlay, mark } = overlayAfterPage();

    const { stop } = land(overlay, new DOMRect(73, 16, 109.5, 36));

    const [keyframes] = keyframesOf(mark).at(-1) ?? [];
    expect(keyframes).toEqual([
      { transform: 'none' },
      { transform: expect.stringMatching(/^translateX\(-638\.0\d*px\) scale\(0\.0638\d*\)$/) },
    ]);
    stop();
  });

  it('measures the mark before the page settles, which can change the size of the view', () => {
    const { overlay, page, mark } = overlayAfterPage();
    const animate = vi.mocked(Element.prototype.animate);
    const stub = animate.getMockImplementation();
    if (!stub) throw new Error('no stub of animate');
    // A scrollbar of 10 px makes the overlay smaller, and moves its center by 5 px.
    animate.mockImplementation(function (this: Element, ...args) {
      if (this === page) mark.getBoundingClientRect = () => new DOMRect(575, 305, 280, 280);
      return stub.apply(this, args);
    });

    const { stop } = land(overlay, new DOMRect(73, 16, 109.5, 36));

    const [keyframes] = keyframesOf(mark).at(-1) ?? [];
    expect(keyframes).toEqual([
      { transform: 'none' },
      { transform: expect.stringMatching(/^translateX\(-638\.0\d*px\) scale\(0\.0638\d*\)$/) },
    ]);
    stop();
  });

  it('hides the scrollbars of the view while the page is larger than the view', () => {
    const { overlay } = overlayAfterPage();

    const { stop } = land(overlay, new DOMRect(73, 16, 109.5, 36));

    expect(keyframesOf(document.documentElement)).toEqual([
      [[{ overflow: 'hidden' }, { overflow: 'hidden' }], { duration: 650 }],
    ]);
    stop();
  });

  it('fades the panel out, settles the page and brings the widgets up row by row', () => {
    const { overlay, page, widgets } = overlayAfterPage();

    const { stop } = land(overlay, new DOMRect(73, 16, 109.5, 36));

    const panel = overlay.querySelector('[data-part="arrival-panel"]');
    expect(keyframesOf(panel).at(-1)?.[0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(keyframesOf(page)[0]?.[0]).toEqual([{ scale: '1.03' }, { scale: '1' }]);
    const delays = widgets.map(widget => keyframesOf(widget)[0]?.[1]);
    expect(delays.map(options => (options as KeyframeAnimationOptions).delay)).toEqual([
      250, 250, 320,
    ]);
    stop();
  });

  it('fades the mark out with the panel when no logo of the shell shows', () => {
    const { overlay, mark } = overlayAfterPage();

    const { stop } = land(overlay, null);

    const flight = overlay.querySelector('[data-part="arrival-flight"]');
    expect(keyframesOf(flight)[0]?.[0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(keyframesOf(mark).map(([keyframes]) => keyframes)).toEqual([
      [{ left: '288px' }, { left: '720px' }],
    ]);
    stop();
  });
});
