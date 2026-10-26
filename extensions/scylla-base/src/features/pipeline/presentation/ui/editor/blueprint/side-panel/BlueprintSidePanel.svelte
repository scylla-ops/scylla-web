<script lang="ts">
  import { ResizablePane } from '@scylla/ui/primitives';
  import type { Blueprint } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.state.svelte.ts';
  import { nodeOf } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import {
    templateFor,
    type CatalogEntry,
  } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import type { PaletteDrag } from '../palette-drag/palette-drag.state.svelte.ts';
  import NodePalette from './NodePalette/NodePalette.svelte';
  import NodeInspector from './NodeInspector/NodeInspector.svelte';

  type Mode = 'palette' | 'inspector';

  // In percent of the blueprint. The inspector holds code: it is wider than the palette.
  const SIDE_PANEL_SIZES = {
    palette: { default: 24, min: 18, max: 40 },
    inspector: { default: 40, min: 28, max: 70 },
  } as const satisfies Record<Mode, { default: number; min: number; max: number }>;

  interface Props {
    blueprint: Blueprint;
    entries: readonly CatalogEntry[];
    projectId?: string;
    drag: PaletteDrag;
    onAdd: (entry: CatalogEntry) => void;
  }

  let { blueprint, entries, projectId, drag, onAdd }: Props = $props();

  const node = $derived(blueprint.inspected ? nodeOf(blueprint.inspected) : undefined);
  const mode = $derived<Mode>(node ? 'inspector' : 'palette');
  const close = () => blueprint.inspect(null);
</script>

<!--
  One panel, two modes: the palette, or the inspector of the node a click opened. paneforge saves a
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
      {#if node}
        {#key node.id}
          <NodeInspector
            {node}
            dependencies={blueprint.dependenciesOf(node.id)}
            detached={blueprint.isDetached(node.id)}
            iconHintOf={definition => templateFor(entries, definition)?.icon}
            {projectId}
            onChange={value => blueprint.updateNode(node.id, value)}
            onRename={id => blueprint.renameNode(node.id, id)}
            onDelete={() => blueprint.removeNode(node.id)}
            onClose={close}
          />
        {/key}
      {:else}
        <NodePalette {entries} {onAdd} {drag} />
      {/if}
    </aside>
  </ResizablePane>
{/key}
