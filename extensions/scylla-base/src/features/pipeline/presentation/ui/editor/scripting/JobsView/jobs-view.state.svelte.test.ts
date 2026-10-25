import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
  JOBS_VIEW_SIZES,
  createJobsViewState,
  type JobsViewOptions,
} from './jobs-view.state.svelte.ts';

type Notify = (entries: Array<{ contentRect: { width: number } }>) => void;

let notifiers: Notify[] = [];

beforeEach(() => {
  notifiers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: Notify) {
        notifiers.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

const resize = (width: number) => {
  for (const notify of notifiers) notify([{ contentRect: { width } }]);
  flushSync();
};

const fakePane = () => ({
  collapse: vi.fn(),
  expand: vi.fn(),
  getId: vi.fn(),
  getSize: vi.fn(() => 50),
  isCollapsed: vi.fn(),
  isExpanded: vi.fn(),
  resize: vi.fn(),
});

const withView = (
  run: (view: ReturnType<typeof createJobsViewState>) => void,
  options?: JobsViewOptions,
) => {
  const cleanup = $effect.root(() => {
    const view = createJobsViewState(options);
    const node = document.createElement('div');
    view.list.measure(node);
    view.properties.measure(node);
    run(view);
  });
  cleanup();
};

describe('createJobsViewState', () => {
  it('opens both panels while nothing has been measured', () => {
    withView(view => {
      expect(view.list.open).toBe(true);
      expect(view.properties.open).toBe(true);
    });
  });

  it('hides the list below 800 px and the properties below 1100 px', () => {
    withView(view => {
      resize(1000);
      expect(view.list.open).toBe(true);
      expect(view.properties.open).toBe(false);

      resize(700);
      expect(view.list.open).toBe(false);
      expect(view.properties.open).toBe(false);
    });
  });

  it('shows a hidden panel again when the view gets wider', () => {
    withView(view => {
      resize(700);
      resize(1200);

      expect(view.list.open).toBe(true);
      expect(view.properties.open).toBe(true);
    });
  });

  it("keeps the user's choice when the width changes", () => {
    withView(view => {
      resize(700);
      view.list.toggle();
      expect(view.list.open).toBe(true);

      resize(500);
      expect(view.list.open).toBe(true);

      resize(1200);
      view.properties.toggle();
      resize(600);
      expect(view.properties.open).toBe(false);
    });
  });

  it('a panel hidden by the width collapses its pane, and its toggle button opens it again', () => {
    withView(view => {
      const pane = fakePane();
      view.list.pane = pane;
      flushSync();
      expect(pane.collapse).not.toHaveBeenCalled();

      resize(700);
      expect(pane.collapse).toHaveBeenCalledTimes(1);

      view.list.toggle();
      flushSync();
      expect(pane.expand).toHaveBeenLastCalledWith();
      expect(view.list.open).toBe(true);
    });
  });

  it('a panel the user collapsed by dragging stays closed when the view gets wider', () => {
    withView(view => {
      resize(1200);
      view.list.onCollapse();
      expect(view.list.open).toBe(false);

      resize(1400);
      expect(view.list.open).toBe(false);
    });
  });

  it('a collapse that the width caused stores no choice', () => {
    withView(view => {
      resize(700);
      view.list.onCollapse();

      resize(1200);
      expect(view.list.open).toBe(true);
    });
  });

  it('dragging open a panel that the width hid keeps it open', () => {
    withView(view => {
      resize(700);
      view.list.onExpand();
      expect(view.list.open).toBe(true);

      resize(500);
      expect(view.list.open).toBe(true);
    });
  });

  it('does not expand again a pane that the user collapsed by dragging', () => {
    withView(view => {
      const pane = fakePane();
      view.list.pane = pane;
      flushSync();
      pane.expand.mockClear();

      view.list.onCollapse();
      flushSync();

      expect(view.list.open).toBe(false);
      expect(pane.expand).not.toHaveBeenCalled();
    });
  });

  it('starts a panel at the size of its state when the view was created', () => {
    withView(
      view => {
        expect(view.list.defaultSize).toBe(JOBS_VIEW_SIZES.list.default);
        expect(view.properties.defaultSize).toBe(0);
      },
      { hasProperties: () => false },
    );
  });

  it('leaves the pane alone while paneforge has no layout for it', () => {
    withView(
      view => {
        const pane = { ...fakePane(), getSize: vi.fn(() => undefined as unknown as number) };
        view.properties.pane = pane;
        flushSync();

        expect(pane.collapse).not.toHaveBeenCalled();
        expect(pane.expand).not.toHaveBeenCalled();
      },
      { hasProperties: () => false },
    );
  });

  it('animates the panels only a frame after the first measure', () => {
    const frames: Array<() => void> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    withView(view => {
      expect(view.animated).toBe(false);

      resize(700);
      expect(view.animated).toBe(false);

      frames.forEach(frame => frame());
      flushSync();
      expect(view.animated).toBe(true);
    });
  });

  describe('the properties, when no job is focused', () => {
    const withFocus = (
      run: (focus: { on: boolean }, view: ReturnType<typeof createJobsViewState>) => void,
    ) => {
      const focus = $state({ on: true });
      withView(view => run(focus, view), { hasProperties: () => focus.on });
    };

    it('collapses the pane, and opens it again when a job comes back', () => {
      withFocus((focus, view) => {
        const pane = fakePane();
        view.properties.pane = pane;
        flushSync();

        focus.on = false;
        flushSync();
        expect(view.properties.open).toBe(false);
        expect(pane.collapse).toHaveBeenCalledTimes(1);

        focus.on = true;
        flushSync();
        expect(view.properties.open).toBe(true);
        expect(pane.expand).toHaveBeenLastCalledWith();
      });
    });

    it('stores no choice for a collapse the lack of a job caused', () => {
      withFocus((focus, view) => {
        focus.on = false;
        flushSync();
        view.properties.onCollapse();
        view.properties.onExpand();

        focus.on = true;
        flushSync();
        expect(view.properties.open).toBe(true);
      });
    });

    it('keeps the choice of the user when a job comes back', () => {
      withFocus((focus, view) => {
        view.properties.toggle();
        expect(view.properties.open).toBe(false);

        focus.on = false;
        flushSync();
        focus.on = true;
        flushSync();
        expect(view.properties.open).toBe(false);
      });
    });
  });
});
