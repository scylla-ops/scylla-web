<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { BlueprintState } from '@base/features/pipeline/presentation/blueprint.state.svelte.ts';
  import {
    START_NODE_ID,
    stepOf,
  } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import NodePalette from './NodePalette/NodePalette.svelte';
  import PipelineInspector from './PipelineInspector.svelte';
  import StepInspector from './StepInspector/StepInspector.svelte';

  interface Props {
    blueprint: BlueprintState;
    entries: readonly CatalogEntry[];
    pipelineName: string;
    projectId?: string;
    onAdd: (entry: CatalogEntry) => void;
    onNameChange: (name: string) => void;
  }

  let { blueprint, entries, pipelineName, projectId, onAdd, onNameChange }: Props = $props();

  const selected = $derived(blueprint.selected);
  const step = $derived(selected ? stepOf(selected) : undefined);
  const close = () => blueprint.select(null);
</script>

<!-- One panel, two moods: the palette while nothing is selected, the inspector of the selection. -->
<aside
  class={cn(
    'flex h-full shrink-0 flex-col border-l bg-card transition-[width] duration-200 ease-out',
    selected ? 'w-120' : 'w-72',
  )}
>
  {#if step}
    {#key step.id}
      <StepInspector
        {step}
        dependencies={blueprint.dependenciesOf(step.id)}
        {projectId}
        onChange={value => blueprint.updateStep(step.id, value)}
        onRename={id => blueprint.renameStep(step.id, id)}
        onDelete={() => blueprint.removeStep(step.id)}
        onClose={close}
      />
    {/key}
  {:else if selected?.id === START_NODE_ID}
    <PipelineInspector name={pipelineName} {onNameChange} onClose={close} />
  {:else}
    <NodePalette {entries} {onAdd} />
  {/if}
</aside>
