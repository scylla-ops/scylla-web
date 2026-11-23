<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { FragmentFlowNode } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { blockSummary } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.registry.ts';

  let { id, data, selected }: NodeProps<FragmentFlowNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].fragment);
  const summary = $derived(
    blockSummary(data.link, data.nodes, canvas.fragmentOf(data.link.fragmentId)),
  );
  const detached = $derived(canvas.isDetached(id));
</script>

<!-- A block that links a fragment of the library, in the style the viewer picked. -->
<View
  name={id}
  nodeCount={data.nodes.length}
  {summary}
  selected={selected ?? false}
  {detached}
/>
