<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import {
    nodeRelations,
    nodeRows,
    nodeStages,
  } from '@base/features/pipeline/presentation/presenters/node-list.presenter.ts';
  import { acceptNodeDrop } from './node-drag.attachments.ts';
  import { createNodeDrag } from './node-drag.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import NodeListRow from './NodeListRow.svelte';

  interface Props {
    nodes: PipelineNodeEntity[];
    /** The node of the focused pane. */
    activeId: string | null;
    onOpen: (id: string) => void;
    onOpenToSide: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    /** A node dropped on `target`, or on the "runs first" zone (`null`). */
    onMove: (id: string, target: string | null, keep: boolean) => void;
  }

  let { nodes, activeId, onOpen, onOpenToSide, onAdd, onRemove, onMove }: Props = $props();

  const uid = $props.id();
  const stages = $derived(nodeStages(nodeRows(nodes)));

  // The node whose links show: the one under the pointer, else the open one.
  let hovered = $state<string | null>(null);
  const relations = $derived(nodeRelations(nodes, hovered ?? activeId));

  const drag = createNodeDrag({
    onDrop: (id, target, keep) => onMove(id, target, keep),
  });
</script>

<nav aria-label={t(scriptingMessages.nodes)} class="@container flex h-full flex-col">
  <!-- During a drag, the header is the "runs first" zone: the rows do not move. -->
  <div
    class="relative flex items-center px-4 pt-3 pb-1.5"
    {@attach acceptNodeDrop(() => ({ target: null, drag }))}
  >
    <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {t(scriptingMessages.nodes)} · {nodes.length}
    </span>
    {#if drag.dragged !== null}
      <div
        class={cn(
          'pointer-events-none absolute inset-x-2 inset-y-1 flex items-center justify-center rounded-md border border-dashed bg-card text-xs text-muted-foreground',
          drag.isOver(null) && 'border-primary bg-primary-subtle text-foreground',
        )}
      >
        {t(nodeMessages.runsFirst)}
      </div>
    {/if}
  </div>

  {#if nodes.length === 0}
    <p class="px-4 py-2 text-sm text-muted-foreground">{t(scriptingMessages.noNode)}</p>
  {/if}

  <div class="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
    {#each stages as stage, index (index)}
      <div role="group" aria-labelledby="{uid}-stage-{index}">
        <h3
          id="{uid}-stage-{index}"
          class="px-2.5 pt-1 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          {t(scriptingMessages.stage(index + 1))}
        </h3>
        <ul class="flex flex-col gap-0.5">
          {#each stage as row (row.node.id)}
            <NodeListRow
              {row}
              active={row.node.id === activeId}
              relation={drag.dragged === null ? relations.get(row.node.id) : undefined}
              {drag}
              onHover={id => (hovered = id)}
              {onOpen}
              {onOpenToSide}
              {onRemove}
            />
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <!--
    One cell for the button and the hint: the footer keeps its height during a drag. In a narrow
    list, the button shows its icon only and the hint does not show.
  -->
  <div class="grid border-t p-2 @[12rem]:p-3">
    <Button
      variant="outline"
      size="sm"
      class={cn(
        'col-start-1 row-start-1 w-full border-dashed',
        drag.dragged !== null && 'invisible',
      )}
      onclick={onAdd}
    >
      <PlusIcon class="size-4" />
      <span class="sr-only @[12rem]:not-sr-only">{t(scriptingMessages.newNode)}</span>
    </Button>
    <p
      class={cn(
        'col-start-1 row-start-1 hidden self-center text-xs text-muted-foreground @[16rem]:block',
        drag.dragged === null && 'invisible',
      )}
    >
      {t(scriptingMessages.dropHint)}
    </p>
  </div>
</nav>
