<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import type { PipelineScripting } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import NodeList from '../NodeList/NodeList.svelte';
  import NodePane from '../NodePane/NodePane.svelte';
  import NodeProperties from '../NodeProperties/NodeProperties.svelte';
  import PanelToggle from './PanelToggle.svelte';
  import { NODES_VIEW_SIZES, createNodesView } from './nodes-view.state.svelte.ts';

  interface Props {
    scripting: PipelineScripting;
    projectId?: string;
  }

  let { scripting, projectId }: Props = $props();

  const view = createNodesView({ hasProperties: () => !!scripting.focusedNode });
</script>

{#snippet listToggle()}
  <PanelToggle panel={view.list} label={t(scriptingMessages.toggleNodeList)} side="left" />
{/snippet}

{#snippet propertiesToggle()}
  <PanelToggle
    panel={view.properties}
    label={t(scriptingMessages.toggleNodeProperties)}
    side="right"
  />
{/snippet}

<!--
  Three panes that never come and go (the list, the nodes, the properties): paneforge builds the
  layout again when their number changes. The toggles of the side panels sit in the tab bars of the
  first and of the last node pane. The handles draw the borders between the panes. The sizes are not
  saved: they last for the visit.
-->
<div
  class="flex h-full min-h-0 overflow-hidden rounded-xl border bg-card"
  {@attach view.list.measure}
  {@attach view.properties.measure}
>
  <ResizablePaneGroup
    direction="horizontal"
    class={cn('min-w-0 flex-1', !view.animated && '[&>[data-pane]]:transition-none')}
  >
    <ResizablePane
      id="nodes-view-list"
      order={1}
      collapsible
      collapsedSize={0}
      defaultSize={view.list.defaultSize}
      minSize={NODES_VIEW_SIZES.list.min}
      maxSize={NODES_VIEW_SIZES.list.max}
      onCollapse={view.list.onCollapse}
      onExpand={view.list.onExpand}
      bind:this={view.list.pane}
      class="bg-muted/30"
    >
      {#if view.list.open}
        <NodeList
          nodes={scripting.nodes}
          activeId={scripting.panes.focusedId}
          onOpen={id => scripting.panes.open(id)}
          onOpenToSide={id => scripting.panes.openToSide(id)}
          onAdd={() => scripting.add()}
          onRemove={id => scripting.remove(id)}
          onMove={(id, target, keep) => scripting.moveNode(id, target, keep)}
        />
      {/if}
    </ResizablePane>

    <ResizableHandle />
    <ResizablePane id="nodes-view-middle" order={2} minSize={NODES_VIEW_SIZES.middle.min}>
      <!-- The open nodes have a group of their own: a second node changes its number of panes, and
           the layout of the list and of the properties must not be built again. -->
      <ResizablePaneGroup direction="horizontal">
        {#each scripting.panes.panes as pane, index (index)}
          {#if index > 0}
            <ResizableHandle />
          {/if}
          <ResizablePane id="nodes-view-pane-{index}" order={1 + index} minSize={NODES_VIEW_SIZES.pane.min}>
            <NodePane
              {scripting}
              {pane}
              {index}
              leading={index === 0 ? listToggle : undefined}
              trailing={index === scripting.panes.panes.length - 1 && scripting.focusedNode
                ? propertiesToggle
                : undefined}
            />
          </ResizablePane>
        {/each}
      </ResizablePaneGroup>
    </ResizablePane>

    <!-- Always there: its handle is the only part that goes when no node is focused. -->
    <ResizableHandle disabled={!scripting.focusedNode} class={scripting.focusedNode ? undefined : 'hidden'} />
    <ResizablePane
      id="nodes-view-properties"
      order={3}
      collapsible
      collapsedSize={0}
      defaultSize={view.properties.defaultSize}
      minSize={NODES_VIEW_SIZES.properties.min}
      maxSize={NODES_VIEW_SIZES.properties.max}
      onCollapse={view.properties.onCollapse}
      onExpand={view.properties.onExpand}
      bind:this={view.properties.pane}
      class="bg-card"
    >
      {#if scripting.focusedNode && view.properties.open}
        <NodeProperties {scripting} node={scripting.focusedNode} {projectId} />
      {/if}
    </ResizablePane>
  </ResizablePaneGroup>
</div>
