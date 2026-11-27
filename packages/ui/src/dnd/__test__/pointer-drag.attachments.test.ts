import { afterEach, describe, expect, it, vi } from 'vitest';
import { dragWithPointer } from '../pointer-drag.attachments.ts';

const pointer = (target: EventTarget, type: string, x: number, y: number, pointerType = 'mouse') =>
  target.dispatchEvent(
    Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType,
      clientX: x,
      clientY: y,
    }),
  );

const detaches: (() => void)[] = [];

const setup = () => {
  const root = document.createElement('div');
  const item = document.createElement('div');
  item.setAttribute('data-item', 'a');
  const other = document.createElement('div');
  root.append(item, other);
  document.body.append(root);
  const calls = { start: vi.fn(), move: vi.fn(), end: vi.fn() };
  const pick = (target: Element) => target.getAttribute('data-item');
  const detach = dragWithPointer<string>(() => ({ pick, ...calls }))(root) as () => void;
  detaches.push(detach);
  return { item, other, calls, detach };
};

afterEach(async () => {
  detaches.splice(0).forEach(detach => detach());
  vi.useRealTimers();
  // The click that ends a drag is taken until the next task.
  await new Promise(resolve => setTimeout(resolve));
  document.body.innerHTML = '';
});

describe('dragWithPointer', () => {
  it('starts a drag after a move of 5 px with a mouse: a smaller move stays a click', () => {
    const { item, calls } = setup();
    pointer(item, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 103, 102);
    expect(calls.start).not.toHaveBeenCalled();

    pointer(window, 'pointermove', 105, 100);
    expect(calls.start).toHaveBeenCalledWith('a', { x: 105, y: 100 }, { x: 100, y: 100 });
    expect(calls.move).toHaveBeenLastCalledWith({ x: 105, y: 100 });

    pointer(window, 'pointermove', 160, 140);
    expect(calls.move).toHaveBeenLastCalledWith({ x: 160, y: 140 });
    pointer(window, 'pointerup', 160, 140);
    expect(calls.end).toHaveBeenCalledWith(true);
  });

  it('does nothing after a click, and the click that ends a drag does nothing', () => {
    const { item, calls } = setup();
    const onclick = vi.fn();
    item.addEventListener('click', onclick);

    pointer(item, 'pointerdown', 100, 100);
    pointer(window, 'pointerup', 100, 100);
    item.click();
    expect(calls.start).not.toHaveBeenCalled();
    expect(calls.end).not.toHaveBeenCalled();
    expect(onclick).toHaveBeenCalledTimes(1);

    pointer(item, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 140, 100);
    pointer(window, 'pointerup', 140, 100);
    item.click();
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('starts no drag on an element that the owner does not pick', () => {
    const { other, calls } = setup();
    pointer(other, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 200, 100);
    expect(calls.start).not.toHaveBeenCalled();
  });

  it('ends the drag with no drop on Escape, and keeps Escape from the page', () => {
    const { item, calls } = setup();
    const page = vi.fn();
    window.addEventListener('keydown', page);
    pointer(item, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 140, 100);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(calls.end).toHaveBeenCalledWith(false);
    expect(page).not.toHaveBeenCalled();
    window.removeEventListener('keydown', page);
  });

  it('drags with a finger after a hold of 250 ms, and lets a quick move scroll the page', () => {
    vi.useFakeTimers();
    const { item, calls } = setup();

    pointer(item, 'pointerdown', 100, 100, 'touch');
    pointer(window, 'pointermove', 100, 130, 'touch');
    vi.advanceTimersByTime(300);
    expect(calls.start).not.toHaveBeenCalled();

    pointer(item, 'pointerdown', 100, 100, 'touch');
    vi.advanceTimersByTime(249);
    expect(calls.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(calls.start).toHaveBeenCalledWith('a', { x: 100, y: 100 }, { x: 100, y: 100 });

    const scroll = new Event('touchmove', { bubbles: true, cancelable: true });
    item.dispatchEvent(scroll);
    expect(scroll.defaultPrevented).toBe(true);
  });

  it('ends a drag with no drop when it goes away', () => {
    const { item, calls, detach } = setup();
    pointer(item, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 140, 100);
    detach();
    expect(calls.end).toHaveBeenCalledWith(false);
  });
});
