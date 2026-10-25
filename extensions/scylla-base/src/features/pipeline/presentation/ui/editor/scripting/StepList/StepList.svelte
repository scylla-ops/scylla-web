<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    buttonVariants,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import { stepRelations, stepRows, stepStages, type StepRow } from './step-list.calculator.ts';
  import { acceptStepDrop, dragStep } from './step-drag.attachments.ts';
  import { createStepDrag } from './step-drag.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import { stepMessages } from '@base/features/pipeline/presentation/ui/editor/step/step.messages.ts';
  import {
    KIND_TONES,
    stepIcon,
  } from '@base/features/pipeline/presentation/ui/editor/step/step-kinds.ts';

  interface Props {
    steps: PipelineStep[];
    /** The step of the focused pane. */
    activeId: string | null;
    onOpen: (id: string) => void;
    onOpenToSide: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    /** A step dropped on `target`, or on the "runs first" zone (`null`). */
    onMove: (id: string, target: string | null, keep: boolean) => void;
  }

  let { steps, activeId, onOpen, onOpenToSide, onAdd, onRemove, onMove }: Props = $props();

  const uid = $props.id();
  const stages = $derived(stepStages(stepRows(steps)));

  // The step whose links show: the one under the pointer, else the open one.
  let hovered = $state<string | null>(null);
  const relations = $derived(stepRelations(steps, hovered ?? activeId));

  const drag = createStepDrag({
    onDrop: (id, target, keep) => onMove(id, target, keep),
  });
</script>

{#snippet stepRow(row: StepRow)}
  {@const Icon = stepIcon(row.step.kind)}
  {@const active = row.step.id === activeId}
  {@const dragged = drag.dragged === row.step.id}
  {@const relation = drag.dragged === null ? relations.get(row.step.id) : undefined}
  <li
    class={cn(
      'group flex items-center rounded-md border-l-2 border-transparent hover:bg-accent',
      active && 'bg-primary-subtle',
      relation === 'dependency' && 'border-info',
      relation === 'dependent' && 'border-primary',
      dragged && 'opacity-50',
      drag.isOver(row.step.id) && 'ring-2 ring-primary ring-inset',
    )}
    onpointerenter={() => (hovered = row.step.id)}
    onpointerleave={() => (hovered = null)}
    {@attach acceptStepDrop(() => ({ target: row.step.id, drag }))}
  >
    <!-- Its width is kept while it is hidden, so nothing shifts when the pointer comes. -->
    <span
      aria-hidden="true"
      class={cn(
        'flex w-4 shrink-0 cursor-grab items-center justify-center self-stretch text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing',
        dragged && 'opacity-100',
      )}
      {@attach dragStep(() => ({ id: row.step.id, drag }))}
    >
      <GripVerticalIcon class="size-3.5" />
    </span>
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      class="flex min-w-0 flex-1 flex-col gap-0.5 py-1.5 pr-1 pl-0.5 text-left font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onclick={() => onOpen(row.step.id)}
    >
      <span class="flex w-full items-center gap-2">
        <Icon class={cn('order-first size-3.5 shrink-0', KIND_TONES[row.step.kind].text)} />
        <span class="min-w-0 flex-1 truncate">{row.step.id}</span>
        {#if row.hasIssue}
          <CircleAlertIcon class="size-3.5 shrink-0 text-destructive" />
          <span class="sr-only">{t(scriptingMessages.stepIssue)}</span>
        {/if}
        <!-- Shown before the id, read after it: the name of the button starts with the step. -->
        <span class="-order-1 shrink-0 text-[11px] text-muted-foreground">
          {row.step.kind === 'script' ? row.step.shell : t(scriptingMessages.commandShort)}
        </span>
      </span>
      {#if row.step.deps.length > 0}
        <span class="w-full truncate pl-5.5 text-[11px] text-muted-foreground">
          <span aria-hidden="true">←</span>
          <span class="sr-only">{t(scriptingMessages.waitsFor)}</span>
          {row.step.deps.join(', ')}
        </span>
      {/if}
    </button>
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0')}
        aria-label={t(scriptingMessages.stepActions(row.step.id))}
      >
        <EllipsisIcon class="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuItem onSelect={() => onOpenToSide(row.step.id)}>
          {t(scriptingMessages.openToSide)}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRemove(row.step.id)} class="text-destructive">
          {t(scriptingMessages.deleteStep)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </li>
{/snippet}

<nav aria-label={t(scriptingMessages.steps)} class="@container flex h-full flex-col">
  <!-- During a drag, the header is the "runs first" zone: the rows do not move. -->
  <div
    class="relative flex items-center px-4 pt-3 pb-1.5"
    {@attach acceptStepDrop(() => ({ target: null, drag }))}
  >
    <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {t(scriptingMessages.steps)} · {steps.length}
    </span>
    {#if drag.dragged !== null}
      <div
        class={cn(
          'pointer-events-none absolute inset-x-2 inset-y-1 flex items-center justify-center rounded-md border border-dashed bg-card text-xs text-muted-foreground',
          drag.isOver(null) && 'border-primary bg-primary-subtle text-foreground',
        )}
      >
        {t(stepMessages.runsFirst)}
      </div>
    {/if}
  </div>

  {#if steps.length === 0}
    <p class="px-4 py-2 text-sm text-muted-foreground">{t(scriptingMessages.noStep)}</p>
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
          {#each stage as row (row.step.id)}
            {@render stepRow(row)}
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
      class={cn('col-start-1 row-start-1 w-full border-dashed', drag.dragged !== null && 'invisible')}
      onclick={onAdd}
    >
      <PlusIcon class="size-4" />
      <span class="sr-only @[12rem]:not-sr-only">{t(scriptingMessages.newStep)}</span>
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
