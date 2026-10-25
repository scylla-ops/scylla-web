import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { acceptStepDrop, dragStep } from './step-drag.attachments.ts';
import { createStepDrag, type StepDrag } from './step-drag.state.svelte.ts';

const fire = (node: HTMLElement, type: string, init: { altKey?: boolean } = {}) => {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    altKey: false,
    dataTransfer: null,
    relatedTarget: null,
    ...init,
  });
  node.dispatchEvent(event);
  return event;
};

const withList = (
  run: (rows: Record<string, HTMLElement>, zone: HTMLElement, drag: StepDrag) => void,
) => {
  const onDrop = vi.fn();
  const cleanup = $effect.root(() => {
    const drag = createStepDrag({ onDrop });
    const rows = Object.fromEntries(
      ['build', 'lint', 'test'].map(id => [id, document.createElement('li')]),
    );
    const zone = document.createElement('div');
    $effect(() => {
      for (const [id, row] of Object.entries(rows)) {
        dragStep(() => ({ id, drag }))(row);
        acceptStepDrop(() => ({ target: id, drag }))(row);
      }
      acceptStepDrop(() => ({ target: null, drag }))(zone);
    });
    flushSync();
    run(rows, zone, drag);
  });
  cleanup();
  return onDrop;
};

describe('step drag', () => {
  it('drops a step on a step it can wait for', () => {
    const onDrop = withList((rows, _zone, drag) => {
      fire(rows.test, 'dragstart');
      expect(fire(rows.build, 'dragover').defaultPrevented).toBe(true);
      expect(drag.isOver('build')).toBe(true);

      fire(rows.build, 'drop');
      expect(drag.dragged).toBeNull();
    });
    expect(onDrop).toHaveBeenCalledWith('test', 'build', false);
  });

  it('keeps the other dependencies when Alt is held', () => {
    const onDrop = withList(rows => {
      fire(rows.test, 'dragstart');
      fire(rows.lint, 'drop', { altKey: true });
    });
    expect(onDrop).toHaveBeenCalledWith('test', 'lint', true);
  });

  it('refuses the dragged step itself', () => {
    const onDrop = withList((rows, _zone, drag) => {
      fire(rows.build, 'dragstart');
      expect(fire(rows.build, 'dragover').defaultPrevented).toBe(false);
      fire(rows.build, 'drop');
      expect(drag.canDrop('test')).toBe(true);
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('makes the step run first on the zone, Alt or not', () => {
    const onDrop = withList((rows, zone) => {
      fire(rows.test, 'dragstart');
      fire(zone, 'drop', { altKey: true });
    });
    expect(onDrop).toHaveBeenCalledWith('test', null, false);
  });

  it('accepts no drop once the drag ended', () => {
    const onDrop = withList(rows => {
      fire(rows.test, 'dragstart');
      fire(rows.test, 'dragend');
      fire(rows.build, 'drop');
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('carries the step in a private type, which no editor or input takes', () => {
    const setData = vi.fn();
    withList(rows => {
      const event = Object.assign(new Event('dragstart', { bubbles: true }), {
        dataTransfer: { setData, effectAllowed: '' },
      });
      rows.test.dispatchEvent(event);
    });
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('application/x-scylla-step', 'test');
  });

  it('ends the drag when the dragged row leaves the list before dragend', () => {
    let drag!: StepDrag;
    const keep = $effect.root(() => {
      drag = createStepDrag({ onDrop: vi.fn() });
    });
    const row = document.createElement('li');
    const stop = $effect.root(() => {
      $effect(() => dragStep(() => ({ id: 'test', drag }))(row));
    });
    flushSync();
    fire(row, 'dragstart');
    flushSync();
    expect(drag.dragged).toBe('test');

    stop();

    expect(drag.dragged).toBeNull();
    keep();
  });
});
