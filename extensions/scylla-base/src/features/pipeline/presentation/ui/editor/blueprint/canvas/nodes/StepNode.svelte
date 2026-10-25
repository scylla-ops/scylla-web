<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BlueprintStepNode } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.registry.ts';
  import { summarize } from '@base/features/pipeline/presentation/presenters/step-summary.presenter.ts';

  let { id, data, selected }: NodeProps<BlueprintStepNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].step);
  const summary = $derived(summarize(data.step, canvas.iconHintOf(data.step)));
  const detached = $derived(canvas.isDetached(id));
</script>

<!-- A step, in the style the viewer picked. -->
<View step={data.step} selected={selected ?? false} {summary} {detached} />
