import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followContentHeight } from './content-height.attachments.ts';

let resize: (height: number) => void = () => {};
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = height =>
          callback(
            [{ borderBoxSize: [{ blockSize: height }] } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
});

const panel = () => {
  const node = document.createElement('div');
  const content = document.createElement('div');
  node.append(content);
  return { node, content };
};

describe('followContentHeight', () => {
  it('gives the panel the height of its content at each change, so a transition can ease it', () => {
    const { node, content } = panel();

    followContentHeight(node);

    expect(observe).toHaveBeenCalledWith(content);
    resize(212);
    expect(node.style.height).toBe('212px');
    resize(84);
    expect(node.style.height).toBe('84px');
  });

  it('stops to follow the content when the panel goes away', () => {
    const { node } = panel();

    const cleanup = followContentHeight(node);
    cleanup?.();

    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('does nothing on a panel with no content', () => {
    followContentHeight(document.createElement('div'));

    expect(observe).not.toHaveBeenCalled();
  });
});
