<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintStartNode } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.ts';

  let { data, selected }: NodeProps<BlueprintStartNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].start);
  const name = $derived(data.name || t(pipelineMessages.unnamedPipeline));
</script>

<!-- The pipeline itself: every step without a dependency hangs off it. Not deletable. -->
<View {name} selected={selected ?? false} />
