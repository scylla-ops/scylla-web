<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import { WidgetZone } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type { StartFlowNode } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { pipelinePoints } from '@base/features/pipeline/presentation/pipeline.points.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { NODE_APPEARANCE_VIEWS } from './node-appearances.registry.ts';

  let { data, selected }: NodeProps<StartFlowNode> = $props();

  const canvas = getBlueprintCanvas();
  const View = $derived(NODE_APPEARANCE_VIEWS[canvas.appearance()].start);
  const name = $derived(data.name || t(pipelineMessages.unnamedPipeline));
  const pipelineId = $derived(canvas.pipelineId());
</script>

<!-- The zone of a saved pipeline: another module puts a count there, such as its triggers. -->
{#snippet badge()}
  <WidgetZone point={pipelinePoints.startBadge} context={{ pipelineId: pipelineId ?? '' }} />
{/snippet}

<!-- The pipeline itself: every node without a dependency hangs off it. Not deletable. -->
<View {name} selected={selected ?? false} badge={pipelineId ? badge : undefined} />
