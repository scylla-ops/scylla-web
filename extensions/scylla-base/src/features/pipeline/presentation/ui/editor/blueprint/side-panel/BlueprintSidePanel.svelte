<script lang="ts">
  import { ResizablePane } from '@scylla/ui/primitives';
  import type { BlueprintState } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.state.svelte.ts';
  import { stepOf } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { templateFor, type CatalogEntry } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import type { PaletteDrag } from '../palette-drag/palette-drag.state.svelte.ts';
  import NodePalette from './NodePalette/NodePalette.svelte';
  import StepInspector from './StepInspector/StepInspector.svelte';

  type Mode = 'palette' | 'inspector';

  // In percent of the blueprint. The inspector holds code: it is wider than the palette.
  const SIDE_PANEL_SIZES = {
    palette: { default: 24, min: 18, max: 40 },
    inspector: { default: 40, min: 28, max: 70 },
  } as const satisfies Record<Mode, { default: number; min: number; max: number }>;

  interface Props {
    blueprint: BlueprintState;
    entries: readonly CatalogEntry[];
    projectId?: string;
    drag: PaletteDrag;
    onAdd: (entry: CatalogEntry) => void;
  }

  let { blueprint, entries, projectId, drag, onAdd }: Props = $props();

  const step = $derived(blueprint.inspected ? stepOf(blueprint.inspected) : undefined);
  const mode = $derived<Mode>(step ? 'inspector' : 'palette');
  const close = () => blueprint.inspect(null);
</script>

<!--
  One panel, two modes: the palette, or the inspector of the step a click opened. paneforge saves a
  layout per set of panes, keyed by their order and constraints (not their ids): the two modes keep
  their own width only while their constraints differ (SIDE_PANEL_SIZES).
-->
{#key mode}
  <ResizablePane
    id="blueprint-{mode}"
    order={2}
    defaultSize={SIDE_PANEL_SIZES[mode].default}
    minSize={SIDE_PANEL_SIZES[mode].min}
    maxSize={SIDE_PANEL_SIZES[mode].max}
  >
    <aside class="flex h-full flex-col bg-card">
      {#if step}
        {#key step.id}
          <StepInspector
            {step}
            dependencies={blueprint.dependenciesOf(step.id)}
            detached={blueprint.isDetached(step.id)}
            iconHintOf={definition => templateFor(entries, definition)?.icon}
            {projectId}
            onChange={value => blueprint.updateStep(step.id, value)}
            onRename={id => blueprint.renameStep(step.id, id)}
            onDelete={() => blueprint.removeStep(step.id)}
            onClose={close}
          />
        {/key}
      {:else}
        <NodePalette {entries} {onAdd} {drag} />
      {/if}
    </aside>
  </ResizablePane>
{/key}
