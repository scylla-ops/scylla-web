import type { Action } from 'svelte/action';
import { START_NODE_ID } from './utils/blueprint-converter.ts';
import { STEP_BLOCK_MIME } from './ui/editor/blueprint/step-blocks.ts';

export interface StepDrop {
  blockKey: string;
  clientX: number;
  clientY: number;
  /** The step it was dropped on: the new step runs after it. */
  afterId?: string;
}

export interface StepDropParams {
  onDrop: (drop: StepDrop) => void;
}

const DROP_TARGET_CLASS = 'is-drop-target';

/** The step under the pointer. The start node is not one: a step dropped on it runs first. */
export const dropTargetOf = (element: EventTarget | null): HTMLElement | null => {
  if (!(element instanceof Element)) return null;
  const node = element.closest<HTMLElement>('.svelte-flow__node');
  if (!node?.dataset.id || node.dataset.id === START_NODE_ID) return null;
  return node;
};

const carriesBlock = (event: DragEvent) =>
  event.dataTransfer?.types.includes(STEP_BLOCK_MIME) ?? false;

/** Lets a palette block be dropped on the canvas, and marks the step it would run after. */
export const acceptStepDrop: Action<HTMLElement, StepDropParams> = (node, initial) => {
  let params = initial;
  let target: HTMLElement | null = null;

  const mark = (next: HTMLElement | null) => {
    if (next === target) return;
    target?.classList.remove(DROP_TARGET_CLASS);
    next?.classList.add(DROP_TARGET_CLASS);
    target = next;
  };

  const onDragOver = (event: DragEvent) => {
    if (!carriesBlock(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    mark(dropTargetOf(event.target));
  };

  const onDragLeave = (event: DragEvent) => {
    if (!node.contains(event.relatedTarget as Node | null)) mark(null);
  };

  const onDrop = (event: DragEvent) => {
    if (!carriesBlock(event)) return;
    event.preventDefault();
    const blockKey = event.dataTransfer?.getData(STEP_BLOCK_MIME) ?? '';
    const afterId = dropTargetOf(event.target)?.dataset.id;
    mark(null);
    params.onDrop({ blockKey, clientX: event.clientX, clientY: event.clientY, afterId });
  };

  node.addEventListener('dragover', onDragOver);
  node.addEventListener('dragleave', onDragLeave);
  node.addEventListener('drop', onDrop);

  return {
    update(next) {
      params = next;
    },
    destroy() {
      mark(null);
      node.removeEventListener('dragover', onDragOver);
      node.removeEventListener('dragleave', onDragLeave);
      node.removeEventListener('drop', onDrop);
    },
  };
};

export interface KeepInViewParams {
  /** The node to keep on screen, in flow coordinates; its id says when it changes. */
  target: { id: string; x: number; y: number; width: number; height: number } | null;
  flowToScreen: (point: { x: number; y: number }) => { x: number; y: number };
  /** Centres the viewport on a flow point, at the current zoom. */
  center: (x: number, y: number) => void;
}

/**
 * Pans the canvas to a node that was just selected when it is out of sight, as when
 * the side panel opens over it. A node already in view does not move the canvas.
 */
export const keepInView: Action<HTMLElement, KeepInViewParams> = (node, initial) => {
  let params = initial;
  let frame = 0;

  const check = () => {
    const target = params.target;
    if (!target) return;
    const box = node.getBoundingClientRect();
    const topLeft = params.flowToScreen({ x: target.x, y: target.y });
    const bottomRight = params.flowToScreen({
      x: target.x + target.width,
      y: target.y + target.height,
    });
    const outside =
      topLeft.x < box.left ||
      topLeft.y < box.top ||
      bottomRight.x > box.right ||
      bottomRight.y > box.bottom;
    if (outside) params.center(target.x + target.width / 2, target.y + target.height / 2);
  };

  return {
    update(next) {
      const changed = next.target?.id !== params.target?.id;
      params = next;
      if (!changed) return;
      // After the frame: the panel that opens with the selection narrows the canvas first.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    },
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
};
