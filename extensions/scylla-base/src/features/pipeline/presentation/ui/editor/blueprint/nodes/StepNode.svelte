<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BlueprintStepNode } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.ts';
  import { summarize } from './node-view.ts';

  let { id, data, selected }: NodeProps<BlueprintStepNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].step);
  const summary = $derived(summarize(data.step));
  // The preview is linked to the start node, as the drop will link the step.
  const detached = $derived(!data.preview && canvas.isDetached(id));
</script>

<!-- A step, in the style the viewer picked. -->
<View step={data.step} selected={selected ?? false} {summary} {detached} />
