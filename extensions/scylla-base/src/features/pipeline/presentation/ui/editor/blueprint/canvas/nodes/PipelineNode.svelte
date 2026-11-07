<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { PipelineFlowNode } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { followHandles } from './follow-handles.effect.svelte.ts';
  import MergeNode from './MergeNode.svelte';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.registry.ts';
  import { summarize } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';

  let { id, data, selected }: NodeProps<PipelineFlowNode> = $props();

  const canvas = getBlueprintCanvas();
  // A merge is small in each style: it only joins edges.
  const View = $derived(
    data.node.kind === 'merge' ? MergeNode : NODE_APPEARANCE_VIEWS[canvas.appearance()].node,
  );
  const summary = $derived(
    summarize(data.node, {
      iconHint: canvas.iconHintOf(data.node),
      repeated: data.repeated,
      issue: canvas.issueOf(data.node.id),
      errorPort: canvas.hasErrorPort(id),
    }),
  );
  const detached = $derived(canvas.isDetached(id));

  followHandles(
    () => id,
    () => summary.outputs.map(output => output.port ?? '').join('\n'),
  );
</script>

<!-- A node, in the style the viewer picked. -->
<View node={data.node} selected={selected ?? false} {summary} {detached} />
