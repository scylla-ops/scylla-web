<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import type { PipelineStep } from '../../../../domain/structs/pipeline.struct.ts';
  import { createBlueprintState } from '../../../blueprint.state.svelte.ts';
  import { START_NODE_ID } from '../../../utils/blueprint-converter.ts';
  import BlueprintCanvas from './BlueprintCanvas.svelte';
  import BlueprintPalette from './BlueprintPalette.svelte';
  import PipelinePanel from './PipelinePanel.svelte';
  import StepPanel from './StepPanel/StepPanel.svelte';

  interface Props {
    steps: PipelineStep[];
    pipelineName: string;
    projectId?: string;
    onStepsChange: (steps: PipelineStep[]) => void;
    onNameChange: (name: string) => void;
  }

  let { steps, pipelineName, projectId, onStepsChange, onNameChange }: Props = $props();

  const blueprint = createBlueprintState({
    steps: () => steps,
    pipelineName: () => pipelineName,
    // Read at call time, so a swapped callback is the one called.
    onStepsChange: next => onStepsChange(next),
  });

  const selectedStep = $derived(blueprint.selectedStep);
</script>

<!-- Palette, canvas, then the panel of what is selected: a click on a node opens it. -->
<SvelteFlowProvider>
  <div class="flex h-full w-full overflow-hidden">
    <BlueprintPalette {blueprint} />
    <BlueprintCanvas {blueprint} />

    {#if selectedStep}
      <!-- A new step, a rename or an edit of the script rebuilds the panel from the step. -->
      {#key `${selectedStep.id}:${blueprint.revision}`}
        <StepPanel {blueprint} step={selectedStep} {projectId} />
      {/key}
    {:else if blueprint.selectedId === START_NODE_ID}
      <PipelinePanel
        name={pipelineName}
        {onNameChange}
        onClose={() => blueprint.select(null)}
      />
    {/if}
  </div>
</SvelteFlowProvider>
