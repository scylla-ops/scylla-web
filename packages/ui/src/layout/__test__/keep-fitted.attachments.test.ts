import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepFitted } from '../keep-fitted.attachments.ts';

let resize: () => void = () => {};
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  disconnect.mockClear();
});

describe('keepFitted', () => {
  it('fits the view at each resize while the view is fitted', () => {
    const fit = vi.fn();
    keepFitted(() => ({ fitted: true, fit }))(document.createElement('div'));

    resize();
    resize();

    expect(fit).toHaveBeenCalledTimes(2);
  });

  it('leaves a view that the user moved, and reads the flag at each resize', () => {
    const fit = vi.fn();
    let fitted = true;
    keepFitted(() => ({ fitted, fit }))(document.createElement('div'));

    fitted = false;
    resize();
    expect(fit).not.toHaveBeenCalled();

    fitted = true;
    resize();
    expect(fit).toHaveBeenCalledOnce();
  });

  it('stops observing the canvas when it is removed', () => {
    const cleanup = keepFitted(() => ({ fitted: true, fit: vi.fn() }))(
      document.createElement('div'),
    );

    if (typeof cleanup === 'function') cleanup();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
