import { useUpdateNodeInternals } from '@xyflow/svelte';

/**
 * Measures the handles of a node again when its ports change: xyflow measures them when the size
 * of the node changes only, and a renamed port leaves its edges with no handle to start from. The
 * mount needs no call: xyflow measures a new node itself.
 */
export const followHandles = (nodeId: () => string, ports: () => string) => {
  const updateNodeInternals = useUpdateNodeInternals();
  let measured = ports();
  $effect(() => {
    const next = ports();
    if (next === measured) return;
    measured = next;
    updateNodeInternals(nodeId());
  });
};
