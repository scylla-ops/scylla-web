import { afterEach, describe, expect, it, vi } from 'vitest';
import { followSections } from './contents.attachments.ts';

describe('followSections', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('marks no section at the top of the page, and stops listening at cleanup', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const onActive = vi.fn();
    const cleanup = followSections(onActive)(document.createElement('article')) as () => void;

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(onActive).toHaveBeenCalledWith('');

    onActive.mockClear();
    cleanup();
    window.dispatchEvent(new Event('scroll'));
    expect(onActive).not.toHaveBeenCalled();
  });
});
