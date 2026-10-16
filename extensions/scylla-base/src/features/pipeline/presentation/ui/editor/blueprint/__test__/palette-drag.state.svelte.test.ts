import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import {
  START_NODE_ID,
  stepsToFlow,
} from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
import { catalogEntries } from '../catalog.ts';
import {
  DROP_PREVIEW_ID,
  createPaletteDrag,
  type DropTarget,
  type PaletteDrag,
} from '../palette-drag.state.svelte.ts';

const [bash] = catalogEntries([]);
const graph = stepsToFlow([], 'nightly');

/** A canvas on the right half of the screen, from x = 500; graph point = screen point - 500. */
const canvas = (drop: DropTarget['drop'] = vi.fn()): DropTarget => ({
  contains: ({ x }) => x >= 500,
  positionAt: ({ x, y }: XYPosition) => ({ x: x - 500, y }),
  drop,
});

const withDrag = (run: (drag: PaletteDrag) => void) => {
  const cleanup = $effect.root(() => {
    run(createPaletteDrag({ stepIdFor: (nodeId: string) => `${nodeId}_1` }));
  });
  cleanup();
};

describe('createPaletteDrag', () => {
  it('shows a card under the pointer while it is outside the canvas', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 100, y: 40 });
      flushSync();

      expect(drag.ghost).toEqual({ entry: bash, client: { x: 100, y: 40 } });
      expect(drag.elements).toBeNull();
      expect(drag.nodesWith(graph.nodes)).toBe(graph.nodes);
    });
  });

  it('over the canvas, draws the step with its final id where the drop puts it', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 100, y: 40 });
      drag.move({ x: 900, y: 120 });
      flushSync();

      expect(drag.ghost).toBeNull();
      const node = drag.nodesWith(graph.nodes).find(n => n.id === DROP_PREVIEW_ID);
      expect(node?.position).toEqual({ x: 400, y: 120 });
      expect(node?.data).toEqual({
        step: { id: `${bash.nodeId}_1`, deps: [], ...bash.definition },
        preview: true,
      });
      expect(node).toMatchObject({ selectable: false, draggable: false, connectable: false });
      expect(drag.edgesWith(graph.edges).at(-1)).toMatchObject({
        source: START_NODE_ID,
        target: DROP_PREVIEW_ID,
      });
    });
  });

  it('drops on the canvas, at the previewed place, and then forgets the drag', () => {
    withDrag(drag => {
      const drop = vi.fn();
      drag.setTarget(canvas(drop));
      drag.start(bash, { x: 100, y: 40 });
      drag.move({ x: 900, y: 120 });
      drag.finish();
      flushSync();

      expect(drop).toHaveBeenCalledWith(bash, { x: 400, y: 120 });
      expect(drag.entry).toBeNull();
      expect(drag.elements).toBeNull();
      expect(drag.ghost).toBeNull();
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

  it('forgets a canvas that unregistered', () => {
    withDrag(drag => {
      const drop = vi.fn();
      const unregister = drag.setTarget(canvas(drop));
      unregister();

      drag.start(bash, { x: 900, y: 120 });
      drag.finish();
      expect(drop).not.toHaveBeenCalled();
    });
  });

  it('never writes the preview back into the graph', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 900, y: 0 });
      flushSync();

      expect(drag.nodesWithout(drag.nodesWith(graph.nodes))).toEqual(graph.nodes);
      expect(drag.edgesWithout(drag.edgesWith(graph.edges))).toEqual(graph.edges);
    });
  });

  it('keeps the size xyflow measured: a node without one stays hidden', () => {
    withDrag(drag => {
      drag.setTarget(canvas());
      drag.start(bash, { x: 900, y: 0 });
      flushSync();

      drag.nodesWithout(
        drag
          .nodesWith(graph.nodes)
          .map(node =>
            node.id === DROP_PREVIEW_ID ? { ...node, measured: { width: 220, height: 96 } } : node,
          ),
      );
      drag.move({ x: 940, y: 40 });
      flushSync();
      expect(drag.elements?.node.measured).toEqual({ width: 220, height: 96 });

      drag.start(bash, { x: 900, y: 0 });
      flushSync();
      expect(drag.elements?.node.measured).toBeUndefined();
    });
  });
});
