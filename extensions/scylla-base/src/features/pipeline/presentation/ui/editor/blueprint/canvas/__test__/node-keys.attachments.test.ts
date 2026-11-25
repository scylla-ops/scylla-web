import { describe, it, expect, vi } from 'vitest';
import { openNodeOnKey } from '../node-keys.attachments.ts';

const canvasWithNode = () => {
  const canvas = document.createElement('div');
  const node = document.createElement('div');
  node.className = 'svelte-flow__node';
  node.dataset.id = 'build';
  const label = document.createElement('p');
  node.append(label);
  canvas.append(node);
  return { canvas, node, label };
};

const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('openNodeOnKey', () => {
  it('opens a focused node on Enter and on Space, as a click does', () => {
    const open = vi.fn();
    const { canvas, node } = canvasWithNode();
    const cleanup = openNodeOnKey(open)(canvas);

    press(node, 'Enter');
    press(node, ' ');

    expect(open.mock.calls).toEqual([['build'], ['build']]);
    cleanup?.();
  });

  it('opens nothing for another key, for a key inside the node, or after its cleanup', () => {
    const open = vi.fn();
    const { canvas, node, label } = canvasWithNode();
    const cleanup = openNodeOnKey(open)(canvas);

    press(node, 'a');
    press(label, 'Enter');
    cleanup?.();
    press(node, 'Enter');

    expect(open).not.toHaveBeenCalled();
  });
});
