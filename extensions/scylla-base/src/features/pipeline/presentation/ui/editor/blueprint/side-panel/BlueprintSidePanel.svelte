<script lang="ts">
  import { ResizablePanel } from '@scylla/ui';
  import type { BlueprintState } from '@base/features/pipeline/presentation/blueprint.state.svelte.ts';
  import {
    SIDE_PANEL_WIDTHS,
    createSidePanelWidth,
  } from '@base/features/pipeline/presentation/side-panel-width.svelte.ts';
  import { stepOf } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import NodePalette from './NodePalette/NodePalette.svelte';
  import StepInspector from './StepInspector/StepInspector.svelte';

  interface Props {
    blueprint: BlueprintState;
    entries: readonly CatalogEntry[];
    projectId?: string;
    onAdd: (entry: CatalogEntry) => void;
  }

  let { blueprint, entries, projectId, onAdd }: Props = $props();

  const step = $derived(blueprint.inspected ? stepOf(blueprint.inspected) : undefined);
  const mode = $derived(step ? 'inspector' : 'palette');
  const width = createSidePanelWidth();
  const close = () => blueprint.inspect(null);
</script>

<!-- One panel, two moods: the palette, or the inspector of the step a click opened. -->
<ResizablePanel
  bind:width={() => width.of(mode), next => width.set(mode, next)}
  min={SIDE_PANEL_WIDTHS[mode].min}
  max={SIDE_PANEL_WIDTHS[mode].max}
  class="max-w-[70%]"
>
  <aside class="flex h-full flex-col border-l bg-card">
    {#if step}
      {#key step.id}
        <StepInspector
          {step}
          dependencies={blueprint.dependenciesOf(step.id)}
          detached={blueprint.isDetached(step.id)}
          {projectId}
          onChange={value => blueprint.updateStep(step.id, value)}
          onRename={id => blueprint.renameStep(step.id, id)}
          onDelete={() => blueprint.removeStep(step.id)}
          onClose={close}
        />
      {/key}
    {:else}
      <NodePalette {entries} {onAdd} />
    {/if}
  </aside>
</ResizablePanel>
