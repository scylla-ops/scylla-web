<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
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
  import { jobRows } from './job-list.calculator.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import {
    KIND_TONES,
    stepIcon,
  } from '@base/features/pipeline/presentation/ui/editor/step/step-kinds.ts';

  interface Props {
    steps: PipelineStep[];
    /** The job of the focused pane. */
    activeId: string | null;
    onOpen: (id: string) => void;
    onOpenToSide: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
  }

  let { steps, activeId, onOpen, onOpenToSide, onAdd, onRemove }: Props = $props();

  const rows = $derived(jobRows(steps));
</script>

<nav aria-label={t(scriptingMessages.jobs)} class="flex h-full flex-col">
  <div class="flex items-center justify-between px-4 pt-3 pb-1.5">
    <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {t(scriptingMessages.jobs)} · {steps.length}
    </span>
    <Button variant="ghost" size="icon-sm" aria-label={t(scriptingMessages.newJob)} onclick={onAdd}>
      <PlusIcon class="size-4" />
    </Button>
  </div>

  {#if rows.length === 0}
    <p class="px-4 py-2 text-sm text-muted-foreground">{t(scriptingMessages.noJob)}</p>
  {/if}

  <ul class="relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
    {#each rows as row (row.step.id)}
      {@const Icon = stepIcon(row.step.kind)}
      {@const active = row.step.id === activeId}
      <li class="group flex items-center rounded-md hover:bg-accent {active ? 'bg-primary-subtle' : ''}">
        <button
          type="button"
          aria-current={active ? 'true' : undefined}
          class="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style:padding-left="{0.625 + row.depth}rem"
          onclick={() => onOpen(row.step.id)}
        >
          <Icon class={cn('size-3.5 shrink-0', KIND_TONES[row.step.kind].text)} />
          <span class="min-w-0 flex-1 truncate">{row.step.id}</span>
          {#if row.hasIssue}
            <CircleAlertIcon class="size-3.5 shrink-0 text-destructive" />
            <span class="sr-only">{t(scriptingMessages.jobIssue)}</span>
          {/if}
          <span class="shrink-0 text-[11px] text-muted-foreground">
            {row.step.kind === 'script' ? row.step.shell : t(blueprintMessages.kindCommand)}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0')}
            aria-label={t(scriptingMessages.jobActions(row.step.id))}
          >
            <EllipsisIcon class="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem onSelect={() => onOpenToSide(row.step.id)}>
              {t(scriptingMessages.openToSide)}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRemove(row.step.id)} class="text-destructive">
              {t(scriptingMessages.deleteJob)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    {/each}
  </ul>

  <div class="border-t p-3">
    <Button variant="outline" size="sm" class="w-full border-dashed" onclick={onAdd}>
      <PlusIcon class="size-4" />
      {t(scriptingMessages.newJob)}
    </Button>
  </div>
</nav>
