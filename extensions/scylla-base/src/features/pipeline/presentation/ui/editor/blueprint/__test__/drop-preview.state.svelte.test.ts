import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { START_NODE_ID, stepsToFlow } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
import { catalogEntries } from '../catalog.ts';
import { DROP_PREVIEW_ID, createDropPreview, type DropPreview } from '../drop-preview.state.svelte.ts';

const [bash] = catalogEntries([]);

const withPreview = (run: (preview: DropPreview) => void) => {
  const cleanup = $effect.root(() => {
    run(createDropPreview({ stepIdFor: nodeId => `${nodeId}_1` }));
  });
  cleanup();
};

const graph = stepsToFlow([], 'nightly');

describe('createDropPreview', () => {
  it('draws nothing until the dragged entry is over the canvas', () => {
    withPreview(preview => {
      preview.start(bash);
      flushSync();

      expect(preview.elements).toBeNull();
      expect(preview.nodesWith(graph.nodes)).toBe(graph.nodes);
    });
  });

  it('draws the step the drop creates, with its final id, where it would land', () => {
    withPreview(preview => {
      preview.start(bash);
      preview.moveTo({ x: 400, y: 120 });
      flushSync();

      const node = preview.nodesWith(graph.nodes).find(n => n.id === DROP_PREVIEW_ID);
      expect(node?.position).toEqual({ x: 400, y: 120 });
      expect(node?.data).toEqual({
        step: { id: `${bash.nodeId}_1`, deps: [], ...bash.definition },
        preview: true,
      });
      expect(node).toMatchObject({ selectable: false, draggable: false, connectable: false });
    });
  });

  it('draws the link from the start node that the drop creates', () => {
    withPreview(preview => {
      preview.start(bash);
      preview.moveTo({ x: 0, y: 0 });
      flushSync();

      const edges = preview.edgesWith(graph.edges);
      expect(edges.at(-1)).toMatchObject({ source: START_NODE_ID, target: DROP_PREVIEW_ID });
    });
  });

  it('never writes the preview back into the graph', () => {
    withPreview(preview => {
      preview.start(bash);
      preview.moveTo({ x: 0, y: 0 });
      flushSync();

      expect(preview.nodesWithout(preview.nodesWith(graph.nodes))).toEqual(graph.nodes);
      expect(preview.edgesWithout(preview.edgesWith(graph.edges))).toEqual(graph.edges);
    });
  });

  it('hides when the entry leaves the canvas, and forgets it when the drag ends', () => {
    withPreview(preview => {
      preview.start(bash);
      preview.moveTo({ x: 0, y: 0 });
      preview.leave();
      flushSync();
      expect(preview.elements).toBeNull();
      expect(preview.entry).toBe(bash);

      preview.end();
      preview.moveTo({ x: 0, y: 0 });
      flushSync();
      expect(preview.entry).toBeNull();
      expect(preview.elements).toBeNull();
    });
  });

  it('keeps the size xyflow measured: a node without one stays hidden', () => {
    withPreview(preview => {
      preview.start(bash);
      preview.moveTo({ x: 0, y: 0 });
      flushSync();

      const drawn = preview.nodesWith(graph.nodes);
      preview.nodesWithout(
        drawn.map(node =>
          node.id === DROP_PREVIEW_ID ? { ...node, measured: { width: 220, height: 96 } } : node,
        ),
      );
      preview.moveTo({ x: 40, y: 40 });
      flushSync();

      expect(preview.elements?.node.measured).toEqual({ width: 220, height: 96 });

      preview.start(bash);
      preview.moveTo({ x: 0, y: 0 });
      flushSync();
      expect(preview.elements?.node.measured).toBeUndefined();
    });
  });
});
