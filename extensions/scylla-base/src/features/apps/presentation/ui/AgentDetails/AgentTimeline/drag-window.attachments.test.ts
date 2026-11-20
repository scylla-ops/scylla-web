import { describe, it, expect, vi } from 'vitest';
import { dragWindow } from './drag-window.attachments.ts';
import type { TimelineWindow, WindowPart } from './timeline-window.state.svelte.ts';

const pointer = (node: HTMLElement, type: string, clientX: number) =>
  node.dispatchEvent(
    Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX,
    }),
  );

const key = (node: HTMLElement, name: string, shiftKey = false) =>
  node.dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey, cancelable: true }));

const attached = (part: WindowPart) => {
  const timeline = {
    begin: vi.fn(),
    drag: vi.fn(),
    end: vi.fn(),
    step: vi.fn(),
  } as unknown as TimelineWindow;
  const node = document.createElement('div');
  const cleanup = dragWindow(part, timeline, pixels => Math.round(pixels / 10))(node);
  return { node, timeline, cleanup };
};

describe('dragWindow', () => {
  it('drags by the days under the pointer, from where the drag began', () => {
    const { node, timeline } = attached('move');

    pointer(node, 'pointerdown', 100);
    pointer(node, 'pointermove', 60);
    pointer(node, 'pointerup', 60);

    expect(timeline.begin).toHaveBeenCalledOnce();
    expect(timeline.drag).toHaveBeenCalledWith('move', -4);
    expect(timeline.end).toHaveBeenCalledOnce();
  });

  it('ignores a move with no drag', () => {
    const { node, timeline } = attached('move');

    pointer(node, 'pointermove', 60);

    expect(timeline.drag).not.toHaveBeenCalled();
  });

  it('moves an edge a day with an arrow and a week with Shift', () => {
    const { node, timeline } = attached('start');

    key(node, 'ArrowLeft');
    key(node, 'ArrowRight', true);
    key(node, 'Enter');

    expect(timeline.step).toHaveBeenNthCalledWith(1, 'start', -1);
    expect(timeline.step).toHaveBeenNthCalledWith(2, 'start', 7);
    expect(timeline.step).toHaveBeenCalledTimes(2);
  });

  it('gives no arrow to the window: only its edges are sliders', () => {
    const { node, timeline } = attached('move');

    key(node, 'ArrowLeft');

    expect(timeline.step).not.toHaveBeenCalled();
  });

  it('ends a drag that is still going when it is removed', () => {
    const { node, timeline, cleanup } = attached('end');

    pointer(node, 'pointerdown', 0);
    cleanup?.();

    expect(timeline.end).toHaveBeenCalledOnce();
  });
});
