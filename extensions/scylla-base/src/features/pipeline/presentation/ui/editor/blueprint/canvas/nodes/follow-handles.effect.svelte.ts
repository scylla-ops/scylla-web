import { useUpdateNodeInternals } from '@xyflow/svelte';

/**
 * Measures the handles of a node again when its ports change: xyflow measures them when the size
 * of the node changes only, and a renamed port leaves its edges with no handle to start from.
 */
export const followHandles = (nodeId: () => string, ports: () => string) => {
  const updateNodeInternals = useUpdateNodeInternals();
  $effect(() => {
    void ports();
    updateNodeInternals(nodeId());
  });
};
