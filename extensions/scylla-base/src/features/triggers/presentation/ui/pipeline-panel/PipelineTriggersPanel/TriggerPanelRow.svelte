<script lang="ts">
  import EditIcon from '@lucide/svelte/icons/pencil';
  import LockIcon from '@lucide/svelte/icons/lock';
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { StatusShape } from '@scylla/ui';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Switch,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { VcsProvider } from '@base/features/integrations';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import {
    lastRun,
    nextRun,
    triggerSummary,
  } from '@base/features/triggers/presentation/presenters/trigger-panel.presenter.ts';
  import { KIND_ICONS } from '@base/features/triggers/presentation/ui/trigger-kind-icons.registry.ts';

  interface Props {
    trigger: TriggerEntity;
    provider?: VcsProvider;
    onToggle: (enabled: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
  }

  let { trigger, provider, onToggle, onEdit, onDelete }: Props = $props();

  const Icon = $derived(KIND_ICONS[trigger.source.kind]);
  const summary = $derived(triggerSummary(trigger, provider));
  const last = $derived(lastRun(trigger));
  const next = $derived(nextRun(trigger));
  // A trigger of the file has a run only when its event came.
  const noRun = $derived(!last && !trigger.fromFile);
</script>

<!-- One trigger: what starts a run, its last run and its next run. A row of the file is read only. -->
<li class={cn('flex items-center gap-2.5 rounded-lg p-2', !trigger.enabled && 'text-muted-foreground')}>
  <span
    class={cn(
      'flex size-8 shrink-0 items-center justify-center rounded-lg',
      trigger.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
    )}
  >
    <Icon class="size-4" aria-hidden="true" />
  </span>

  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <span class="truncate text-[13px] font-medium">{trigger.name}</span>
    <span class="truncate text-[11.5px] text-muted-foreground" title={summary}>{summary}</span>
    {#if last || next || noRun}
      <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-foreground">
        {#if last}
          <span class="inline-flex min-w-0 items-center gap-1" title={last.title}>
            <StatusShape state={last.state} label={last.result} size={12} />
            <span class="truncate">{last.text}</span>
          </span>
        {:else if noRun}
          <span>{t(triggersMessages.neverFired)}</span>
        {/if}
        {#if next}
          <span class="truncate">{next}</span>
        {/if}
      </span>
    {/if}
  </div>

  {#if trigger.fromFile}
    <Tooltip>
      <TooltipTrigger
        type="button"
        class="flex size-7 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <LockIcon class="size-3.5" aria-hidden="true" />
        <span class="sr-only">{t(triggersMessages.fileTriggerReadOnly)}</span>
      </TooltipTrigger>
      <TooltipContent><p>{t(triggersMessages.fileTriggerReadOnly)}</p></TooltipContent>
    </Tooltip>
  {:else}
    <Switch
      checked={trigger.enabled}
      onCheckedChange={onToggle}
      aria-label={t(triggersMessages.toggleEnabled(trigger.name))}
    />
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'shrink-0 text-muted-foreground hover:text-foreground',
        )}
      >
        <MoreHorizontalIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">{t(triggersMessages.triggerActions)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-40">
        <DropdownMenuItem onSelect={onEdit}>
          <EditIcon class="mr-2 size-4" aria-hidden="true" />
          {t(triggersMessages.edit)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2Icon class="mr-2 size-4" aria-hidden="true" />
          {t(triggersMessages.delete)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
</li>
