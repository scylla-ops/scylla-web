<script lang="ts">
  import { ResizablePane } from '@scylla/ui/primitives';
  import type { Blueprint } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.state.svelte.ts';
  import { nodeOf } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { templateFor, type CatalogEntry } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import type { PaletteDrag } from '../palette-drag/palette-drag.state.svelte.ts';
  import type { EditorLibrary } from '../editor-library.state.svelte.ts';
  import PalettePanel from './PalettePanel.svelte';
  import NodeInspector from './NodeInspector/NodeInspector.svelte';
  import FragmentInspector from './FragmentInspector/FragmentInspector.svelte';
  import SelectionPanel from './SelectionPanel/SelectionPanel.svelte';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

  type Mode = 'palette' | 'inspector' | 'block' | 'selection';

  type Sizes = Record<Mode, { default: number; min: number; max: number }>;

  // In percent of the blueprint's width. The inspector holds code: it is wider than the palette.
  const SIDE_PANEL_SIZES = {
    palette: { default: 24, min: 18, max: 40 },
    inspector: { default: 40, min: 28, max: 70 },
    block: { default: 26, min: 20, max: 45 },
    selection: { default: 24, min: 18, max: 41 },
  } as const satisfies Sizes;

  // Under the canvas, in percent of the blueprint's height. Not the constraints of the panel beside
  // the canvas: paneforge saves one layout per set of constraints.
  const STACKED_SIDE_PANEL_SIZES = {
    palette: { default: 50, min: 25, max: 70 },
    inspector: { default: 65, min: 35, max: 80 },
    block: { default: 50, min: 25, max: 72 },
    selection: { default: 50, min: 25, max: 71 },
  } as const satisfies Sizes;

  interface Props {
    blueprint: Blueprint;
    entries: readonly CatalogEntry[];
    library: EditorLibrary;
    /** `false`: the pipeline cannot link a fragment yet. */
    linkable: boolean;
    projectId?: string;
    drag: PaletteDrag;
    /** The panel is under the canvas, not right of it. */
    stacked: boolean;
    onAdd: (entry: CatalogEntry) => void;
    onSaveSelection?: () => void;
    /** Makes a fragment of one node. */
    onSaveNode?: (node: PipelineNodeEntity) => void;
  }

  let {
    blueprint,
    entries,
    library,
    linkable,
    projectId,
    drag,
    stacked,
    onAdd,
    onSaveSelection,
    onSaveNode,
  }: Props =
    $props();

  const node = $derived(blueprint.inspected ? nodeOf(blueprint.inspected) : undefined);
  const block = $derived(blueprint.inspectedBlock);
  const mode = $derived<Mode>(
    blueprint.selecting ? 'selection' : node ? 'inspector' : block ? 'block' : 'palette',
  );
  const sizes = $derived((stacked ? STACKED_SIDE_PANEL_SIZES : SIDE_PANEL_SIZES)[mode]);
  const close = () => blueprint.inspect(null);
</script>

<!--
  One panel, four modes: the palette, the inspector of the node or of the block a click opened, or
  the nodes that a box selected. paneforge saves a layout per set of panes, keyed by their order
  and constraints (not their ids): each mode keeps its own size only while their constraints
  differ (SIDE_PANEL_SIZES, STACKED_SIDE_PANEL_SIZES). The pane is built again when the panel goes
  under the canvas or back beside it, with the constraints of that place.
-->
{#key `${mode}:${stacked}`}
  <ResizablePane
    id="blueprint-{mode}"
    order={2}
    defaultSize={sizes.default}
    minSize={sizes.min}
    maxSize={sizes.max}
  >
    <aside class="flex h-full flex-col bg-card">
      {#if mode === 'inspector' && node}
        <!-- A new draft for each node, and when an "Undo" puts the node back. -->
        {#key `${node.id}#${blueprint.revision}`}
          <NodeInspector
            {node}
            dependencies={blueprint.dependenciesOf(node.id)}
            detached={blueprint.isDetached(node.id)}
            issue={blueprint.issueOf(node.id)}
            errorOutput={blueprint.hasErrorPort(node.id)}
            outputNodes={blueprint.outputNodesOf(node.id)}
            iconHintOf={definition => templateFor(entries, definition)?.icon}
            {projectId}
            onChange={(value, port) => blueprint.updateNode(node.id, value, port)}
            onRename={id => blueprint.renameNode(node.id, id)}
            onErrorOutputChange={on => blueprint.setErrorOutput(node.id, on)}
            onDelete={() => blueprint.removeNode(node.id)}
            onClose={close}
            onSaveToLibrary={onSaveNode && (() => onSaveNode(node))}
          />
        {/key}
      {:else if mode === 'block' && block}
        {#key block.id}
          <FragmentInspector
            blockId={block.id}
            block={block.data}
            fragment={library.fragmentOf(block.data.link.fragmentId)}
            workspaceName={library.workspaceName}
            {projectId}
            onChange={(content, skipped) => blueprint.updateBlock(block.id, content, skipped)}
            onDetach={() => blueprint.detachBlock(block.id)}
            onRemove={() => blueprint.removeNodes([block.id])}
            onClose={close}
          />
        {/key}
      {:else if mode === 'selection'}
        <SelectionPanel
          nodes={blueprint.selectedNodes}
          blocks={blueprint.selectedBlocks.map(block => block.data.link.blockId)}
          onSave={blueprint.selectedBlocks.length ? undefined : onSaveSelection}
          onDelete={() =>
            blueprint.removeNodes([
              ...blueprint.selectedNodes.map(node => node.id),
              ...blueprint.selectedBlocks.map(block => block.id),
            ])}
        />
      {:else}
        <PalettePanel
          {entries}
          fragments={library.fragments}
          workspaceName={library.workspaceName}
          {linkable}
          {drag}
          {onAdd}
          onAddFragment={fragment => library.add(fragment)}
        />
      {/if}
    </aside>
  </ResizablePane>
{/key}
