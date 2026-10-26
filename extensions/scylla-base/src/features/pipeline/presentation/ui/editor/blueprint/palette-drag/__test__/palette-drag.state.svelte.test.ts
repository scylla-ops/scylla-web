import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import { catalogEntries } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
import {
  createPaletteDrag,
  type DropTarget,
  type PaletteDrag,
} from '../palette-drag.state.svelte.ts';

const [bash] = catalogEntries([]);

/** A canvas on the right of the screen, from x = 500; graph point = screen point - 500. */
const canvas = (drop: DropTarget['drop'] = vi.fn()): DropTarget => ({
  contains: ({ x }) => x >= 500,
  positionAt: ({ x, y }: XYPosition) => ({ x: x - 500, y }),
  drop,
});

const withDrag = (run: (drag: PaletteDrag) => void) => {
  const cleanup = $effect.root(() => run(createPaletteDrag()));
  cleanup();
};

describe('createPaletteDrag', () => {
  it('follows the pointer, and outlines nothing outside the canvas', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 100, y: 40 });
      flushSync();

      expect(drag.entry).toBe(bash);
      expect(drag.pointer).toEqual({ x: 100, y: 40 });
      expect(drag.spot).toBeNull();
    });
  });

  it('over the canvas, outlines where the drop puts the node', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 100, y: 40 });
      drag.move({ x: 900, y: 120 });
      flushSync();

      expect(drag.pointer).toEqual({ x: 900, y: 120 });
      expect(drag.spot).toEqual({ x: 400, y: 120 });
    });
  });

  it('drops on the canvas at the outlined place, then forgets the drag', () => {
    withDrag(drag => {
      const drop = vi.fn();
      drag.setTarget(canvas(drop));
      drag.start(bash, { x: 100, y: 40 });
      drag.move({ x: 900, y: 120 });
      drag.finish();
      flushSync();

      expect(drop).toHaveBeenCalledWith(bash, { x: 400, y: 120 });
      expect(drag.entry).toBeNull();
      expect(drag.pointer).toBeNull();
      expect(drag.spot).toBeNull();
    });
  });

  it('adds nothing when released outside the canvas, or cancelled', () => {
    withDrag(drag => {
      const drop = vi.fn();
      drag.setTarget(canvas(drop));

      drag.start(bash, { x: 100, y: 40 });
      drag.finish();

      drag.start(bash, { x: 100, y: 40 });
      drag.move({ x: 900, y: 120 });
      drag.cancel();
      drag.finish();

      expect(drop).not.toHaveBeenCalled();
    });
  });

  it('ignores a move after the drag ended, and a canvas that unregistered', () => {
    withDrag(drag => {
      const drop = vi.fn();
      const unregister = drag.setTarget(canvas(drop));
      drag.move({ x: 900, y: 0 });
      expect(drag.pointer).toBeNull();

      unregister();
      drag.start(bash, { x: 900, y: 120 });
      expect(drag.spot).toBeNull();
      drag.finish();
      expect(drop).not.toHaveBeenCalled();
    });
  });
});
