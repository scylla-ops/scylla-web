<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { PipelineFlowNode } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.registry.ts';
  import { summarize } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';

  let { id, data, selected }: NodeProps<PipelineFlowNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].node);
  const summary = $derived(summarize(data.node, canvas.iconHintOf(data.node), data.repeated));
  const detached = $derived(canvas.isDetached(id));
</script>

<!-- A node, in the style the viewer picked. -->
<View node={data.node} selected={selected ?? false} {summary} {detached} />
