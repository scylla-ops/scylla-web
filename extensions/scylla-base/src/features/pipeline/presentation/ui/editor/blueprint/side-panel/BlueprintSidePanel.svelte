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

  // In percent of the blueprint. The inspector holds code: it is wider than the palette.
  const SIDE_PANEL_SIZES = {
    palette: { default: 24, min: 18, max: 40 },
    inspector: { default: 40, min: 28, max: 70 },
    block: { default: 26, min: 20, max: 45 },
    selection: { default: 24, min: 18, max: 41 },
  } as const satisfies Record<Mode, { default: number; min: number; max: number }>;

  interface Props {
    blueprint: Blueprint;
    entries: readonly CatalogEntry[];
    library: EditorLibrary;
    /** `false`: the pipeline cannot link a fragment yet. */
    linkable: boolean;
    projectId?: string;
    drag: PaletteDrag;
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
    onAdd,
    onSaveSelection,
    onSaveNode,
  }: Props =
    $props();

  const node = $derived(blueprint.inspected ? nodeOf(blueprint.inspected) : undefined);
  const block = $derived(blueprint.inspectedBlock);
  const mode = $derived<Mode>(
    node ? 'inspector' : block ? 'block' : blueprint.selecting ? 'selection' : 'palette',
  );
  const close = () => blueprint.inspect(null);
</script>

<!--
  One panel, four modes: the palette, the inspector of the node or of the block a click opened, or
  the nodes that a box selected. paneforge saves a layout per set of panes, keyed by their order
  and constraints (not their ids): each mode keeps its own width only while their constraints
  differ (SIDE_PANEL_SIZES).
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
      {:else if block}
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
        <SelectionPanel nodes={blueprint.selectedNodes} onSave={onSaveSelection} />
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
