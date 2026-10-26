<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    buttonVariants,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { NodeRelation, NodeRow } from '@base/features/pipeline/presentation/presenters/node-list.presenter.ts';
  import { acceptNodeDrop, dragNode } from './node-drag.attachments.ts';
  import type { NodeDrag } from './node-drag.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import {
    KIND_TONES,
    nodeIcon,
  } from '@base/features/pipeline/presentation/presenters/node-kind.presenter.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    row: NodeRow;
    active: boolean;
    relation: NodeRelation | undefined;
    drag: NodeDrag;
    onHover: (id: string | null) => void;
    onOpen: (id: string) => void;
    onOpenToSide: (id: string) => void;
    onRemove: (id: string) => void;
  }

  let { row, active, relation, drag, onHover, onOpen, onOpenToSide, onRemove }: Props = $props();

  const Icon = $derived(nodeIcon(row.node.kind));
  const dragged = $derived(drag.dragged === row.node.id);
</script>

<li
  class={cn(
    'group flex items-center rounded-md border-l-2 border-transparent hover:bg-accent',
    active && 'bg-primary-subtle',
    relation === 'dependency' && 'border-info',
    relation === 'dependent' && 'border-primary',
    dragged && 'opacity-50',
    drag.isOver(row.node.id) && 'ring-2 ring-primary ring-inset',
  )}
  onpointerenter={() => onHover(row.node.id)}
  onpointerleave={() => onHover(null)}
  {@attach acceptNodeDrop(() => ({ target: row.node.id, drag }))}
>
  <!-- Its width is kept while it is hidden, so nothing shifts when the pointer comes. -->
  <span
    aria-hidden="true"
    class={cn(
      'flex w-4 shrink-0 cursor-grab items-center justify-center self-stretch text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing',
      dragged && 'opacity-100',
    )}
    {@attach dragNode(() => ({ id: row.node.id, drag }))}
  >
    <GripVerticalIcon class="size-3.5" />
  </span>
  <button
    type="button"
    aria-current={active ? 'true' : undefined}
    class="flex min-w-0 flex-1 flex-col gap-0.5 py-1.5 pr-1 pl-0.5 text-left font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    onclick={() => onOpen(row.node.id)}
  >
    <span class="flex w-full items-center gap-2">
      <Icon class={cn('order-first size-3.5 shrink-0', KIND_TONES[row.node.kind].text)} />
      <span class="min-w-0 flex-1 truncate">{row.node.id}</span>
      {#if row.hasIssue}
        <CircleAlertIcon class="size-3.5 shrink-0 text-destructive" />
        <span class="sr-only">{t(scriptingMessages.nodeIssue)}</span>
      {/if}
      <!-- Shown before the id, read after it: the name of the button starts with the node. -->
      <span class="-order-1 shrink-0 text-[11px] text-muted-foreground">
        {row.node.kind === 'script' ? row.node.shell : t(scriptingMessages.commandShort)}
      </span>
    </span>
    {#if row.node.deps.length > 0}
      <span class="w-full truncate pl-5.5 text-[11px] text-muted-foreground">
        <span aria-hidden="true">←</span>
        <span class="sr-only">{t(scriptingMessages.waitsFor)}</span>
        {row.node.deps.join(', ')}
      </span>
    {/if}
  </button>
  <DropdownMenu>
    <DropdownMenuTrigger
      class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0')}
      aria-label={t(scriptingMessages.nodeActions(row.node.id))}
    >
      <EllipsisIcon class="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuItem onSelect={() => onOpenToSide(row.node.id)}>
        {t(scriptingMessages.openToSide)}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onRemove(row.node.id)} class="text-destructive">
        {t(nodeMessages.deleteNode)}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</li>
