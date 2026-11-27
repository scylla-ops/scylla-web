import { afterEach, describe, expect, it, vi } from 'vitest';
import { dragWithKeys } from '../keyboard-drag.attachments.ts';

const setup = () => {
  let lifted = false;
  const calls = {
    pick: vi.fn(() => (lifted = true)),
    step: vi.fn(),
    drop: vi.fn(() => (lifted = false)),
    cancel: vi.fn(() => (lifted = false)),
  };
  const handle = document.createElement('button');
  document.body.append(handle);
  dragWithKeys(() => ({ lifted: () => lifted, ...calls }))(handle);
  handle.focus();
  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    handle.dispatchEvent(event);
    return event;
  };
  return { handle, calls, press };
};

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('dragWithKeys', () => {
  it('takes the item with Space, moves it with the arrow keys, and drops it with Enter', () => {
    const { calls, press } = setup();
    press('ArrowDown');
    expect(calls.step).not.toHaveBeenCalled();

    press(' ');
    expect(calls.pick).toHaveBeenCalled();
    press('ArrowDown');
    press('ArrowRight');
    press('ArrowUp');
    press('ArrowLeft');
    expect(calls.step.mock.calls.map(([delta]) => delta)).toEqual([1, 1, -1, -1]);

    press('Enter');
    expect(calls.drop).toHaveBeenCalled();
  });

  it('cancels with Escape, and keeps Escape from the page', () => {
    const { handle, calls, press } = setup();
    press(' ');
    const page = vi.fn();
    document.body.addEventListener('keydown', page);

    const escape = press('Escape');

    expect(calls.cancel).toHaveBeenCalled();
    expect(escape.defaultPrevented).toBe(true);
    expect(page).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(handle);
  });

  it('drops the item where it is when the focus goes away', () => {
    vi.useFakeTimers();
    const { handle, calls, press } = setup();
    press(' ');
    const other = document.createElement('button');
    document.body.append(other);
    other.focus();
    handle.dispatchEvent(new FocusEvent('focusout'));
    vi.runAllTimers();
    expect(calls.drop).toHaveBeenCalled();
  });

  it('does not drop when the owner moves the item to a new element', () => {
    vi.useFakeTimers();
    const { handle, calls, press } = setup();
    press(' ');
    handle.remove();
    handle.dispatchEvent(new FocusEvent('focusout'));
    vi.runAllTimers();
    expect(calls.drop).not.toHaveBeenCalled();
  });
});
