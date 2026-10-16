<!-- The palette and the panel over a real blueprint state, without the canvas jsdom cannot lay out. -->
<script lang="ts">
  import type { PipelineStep } from '../../../../../domain/structs/pipeline.struct.ts';
  import { createBlueprintState } from '../../../../blueprint.state.svelte.ts';
  import BlueprintPalette from '../BlueprintPalette.svelte';
  import StepPanel from './StepPanel.svelte';

  interface Props {
    steps: PipelineStep[];
    selected?: string;
    onStepsChange: (steps: PipelineStep[]) => void;
  }

  let { steps, selected, onStepsChange }: Props = $props();

  const blueprint = createBlueprintState({
    steps: () => steps,
    pipelineName: () => 'nightly',
    onStepsChange: next => onStepsChange(next),
  });
  // svelte-ignore state_referenced_locally
  blueprint.select(selected ?? null);
</script>

<BlueprintPalette {blueprint} />
{#if blueprint.selectedStep}
  {#key `${blueprint.selectedStep.id}:${blueprint.revision}`}
    <StepPanel {blueprint} step={blueprint.selectedStep} projectId="p" />
  {/key}
{/if}
