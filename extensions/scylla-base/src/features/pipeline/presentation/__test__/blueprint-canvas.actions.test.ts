import { describe, it, expect, vi, afterEach } from 'vitest';
import { acceptStepDrop, dropTargetOf, keepInView } from '../blueprint-canvas.actions.ts';
import { START_NODE_ID } from '../utils/blueprint-converter.ts';
import { STEP_BLOCK_MIME } from '../ui/editor/blueprint/step-blocks.ts';

/** A canvas with a step node and the start node, as `@xyflow/svelte` marks them. */
const canvas = () => {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="svelte-flow__node" data-id="build"><span id="inside-build">build</span></div>
    <div class="svelte-flow__node" data-id="${START_NODE_ID}"><span id="inside-start">start</span></div>
    <div id="pane"></div>`;
  document.body.append(root);
  return root;
};

/** jsdom has no `DragEvent`: an event carrying a `dataTransfer` is all the action reads. */
const dragEvent = (type: string, data: Record<string, string> = { [STEP_BLOCK_MIME]: 'bash' }) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY: 20 });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: Object.keys(data),
      getData: (type: string) => data[type] ?? '',
      dropEffect: 'none',
    },
  });
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dropTargetOf', () => {
  it('finds the step under the pointer', () => {
    canvas();
    expect(dropTargetOf(document.getElementById('inside-build'))?.dataset.id).toBe('build');
  });

  it('does not take the start node or the empty pane for a step', () => {
    canvas();
    expect(dropTargetOf(document.getElementById('inside-start'))).toBeNull();
    expect(dropTargetOf(document.getElementById('pane'))).toBeNull();
    expect(dropTargetOf(null)).toBeNull();
  });
});

describe('acceptStepDrop', () => {
  it('drops a block on a step: the new step runs after it', () => {
    const root = canvas();
    const onDrop = vi.fn();
    const action = acceptStepDrop(root, { onDrop });

    document.getElementById('inside-build')!.dispatchEvent(dragEvent('drop'));

    expect(onDrop).toHaveBeenCalledWith({
      blockKey: 'bash',
      clientX: 10,
      clientY: 20,
      afterId: 'build',
    });
    action?.destroy?.();
  });

  it('drops a block on the pane: the new step runs first', () => {
    const root = canvas();
    const onDrop = vi.fn();
    acceptStepDrop(root, { onDrop });

    document.getElementById('pane')!.dispatchEvent(dragEvent('drop'));

    expect(onDrop.mock.lastCall?.[0].afterId).toBeUndefined();
  });

  it('marks the step a block hovers, and only that one', () => {
    const root = canvas();
    acceptStepDrop(root, { onDrop: vi.fn() });
    const build = root.querySelector('[data-id="build"]')!;

    const over = dragEvent('dragover');
    document.getElementById('inside-build')!.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(build).toHaveClass('is-drop-target');

    document.getElementById('pane')!.dispatchEvent(dragEvent('dragover'));
    expect(build).not.toHaveClass('is-drop-target');
  });

  it('ignores what is not a palette block, such as a dragged file', () => {
    const root = canvas();
    const onDrop = vi.fn();
    acceptStepDrop(root, { onDrop });

    const over = dragEvent('dragover', { Files: '' });
    document.getElementById('pane')!.dispatchEvent(over);
    document.getElementById('pane')!.dispatchEvent(dragEvent('drop', { Files: '' }));

    expect(over.defaultPrevented).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('stops listening once destroyed', () => {
    const root = canvas();
    const onDrop = vi.fn();
    const action = acceptStepDrop(root, { onDrop });

    action?.destroy?.();
    document.getElementById('pane')!.dispatchEvent(dragEvent('drop'));

    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('keepInView', () => {
  // A 1000×600 canvas at (0, 0), with the flow drawn at scale 1.
  const box = (): HTMLElement => {
    const element = document.createElement('div');
    element.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 1000, bottom: 600 }) as DOMRect;
    return element;
  };
  const target = (id: string, x: number) => ({ id, x, y: 100, width: 220, height: 96 });

  const run = (x: number) => {
    vi.useFakeTimers();
    const center = vi.fn();
    const base = { flowToScreen: (point: { x: number; y: number }) => point, center };
    const action = keepInView(box(), { ...base, target: null });
    action?.update?.({ ...base, target: target('build', x) });
    vi.runAllTimers();
    vi.useRealTimers();
    return center;
  };

  it('pans to a selected node hidden behind the panel', () => {
    expect(run(900)).toHaveBeenCalledWith(1010, 148);
  });

  it('leaves the canvas alone when the node is in view', () => {
    expect(run(200)).not.toHaveBeenCalled();
  });

  it('does nothing while the selection stays the same', () => {
    vi.useFakeTimers();
    const center = vi.fn();
    const base = { flowToScreen: (point: { x: number; y: number }) => point, center };
    const action = keepInView(box(), { ...base, target: target('build', 900) });
    action?.update?.({ ...base, target: target('build', 900) });
    vi.runAllTimers();
    vi.useRealTimers();
    expect(center).not.toHaveBeenCalled();
  });
});
