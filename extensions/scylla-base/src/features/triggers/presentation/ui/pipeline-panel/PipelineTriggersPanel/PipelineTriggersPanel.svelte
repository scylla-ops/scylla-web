<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineStartPanelContext } from '@base/features/pipeline';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerPanelMessages } from '@base/features/triggers/presentation/messages/trigger-panel.messages.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import { freeTriggerName } from '@base/features/triggers/presentation/presenters/trigger-panel.presenter.ts';
  import { triggerKindLabel } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';
  import { KIND_ICONS } from '@base/features/triggers/presentation/ui/trigger-kind-icons.registry.ts';
  import { createPipelineTriggersPanel } from './pipeline-triggers-panel.state.svelte.ts';
  import ScheduleQuickForm from './ScheduleQuickForm.svelte';
  import TriggerPanelRow from './TriggerPanelRow.svelte';

  interface Props {
    context: PipelineStartPanelContext;
  }

  let { context }: Props = $props();

  const panel = createPipelineTriggersPanel(() => context);
</script>

{#snippet group(title: string)}
  <h3 class="px-2 pt-3 pb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
    {title}
  </h3>
{/snippet}

{#snippet rows(triggers: TriggerEntity[])}
  <ul class="flex flex-col">
    {#each triggers as trigger (trigger.id)}
      <TriggerPanelRow
        {trigger}
        provider={panel.provider}
        onToggle={enabled => panel.setEnabled(trigger, enabled)}
        onEdit={() => panel.edit(trigger)}
        onDelete={() => panel.askDelete(trigger)}
      />
    {/each}
  </ul>
{/snippet}

<!-- The body of the panel of the start node, under its title: the triggers of the pipeline. -->
<div class="flex min-h-0 flex-1 flex-col">
  <div class="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
    {#if panel.isLoading}
      <div class="flex flex-col gap-2 p-2">
        <Skeleton class="h-14 w-full rounded-lg" />
        <Skeleton class="h-14 w-full rounded-lg" />
      </div>
    {:else if panel.loadError}
      <p role="alert" class="px-2 py-3 text-sm text-destructive">{panel.loadError}</p>
    {:else}
      {#if panel.fromFile.length > 0}
        {@render group(t(triggerPanelMessages.fromFile))}
        {@render rows(panel.fromFile)}
      {/if}
      {#if panel.isFile}
        {@render group(t(triggerPanelMessages.storedInScylla))}
      {/if}
      {#if panel.stored.length > 0}
        {@render rows(panel.stored)}
      {:else if !panel.adding}
        <p class="px-2 py-2 text-[12.5px] text-muted-foreground">
          {panel.triggers.length > 0
            ? t(triggerPanelMessages.noStoredTrigger)
            : t(triggerPanelMessages.noTrigger)}
        </p>
      {/if}
      {#if panel.adding}
        <ScheduleQuickForm
          pipelineId={context.pipelineId}
          defaultName={freeTriggerName(t(triggersMessages.kindSchedule), panel.triggers)}
          onClose={() => panel.closeForm()}
          onFullEditor={() => panel.toFullEditor()}
        />
      {/if}
    {/if}
  </div>

  <footer class="flex items-center gap-2 border-t px-4 py-3">
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        disabled={panel.adding || panel.isLoading}
      >
        <PlusIcon aria-hidden="true" />
        {t(triggerPanelMessages.addTrigger)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-48">
        {#each panel.kinds as kind (kind)}
          {@const Icon = KIND_ICONS[kind]}
          <DropdownMenuItem onSelect={() => panel.add(kind)}>
            <Icon class="mr-2 size-4" aria-hidden="true" />
            {triggerKindLabel(kind, panel.provider)}
          </DropdownMenuItem>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
    <Button variant="ghost" size="sm" class="ml-auto" onclick={() => panel.toList()}>
      {t(triggerPanelMessages.triggersPage)}
      <ArrowRightIcon aria-hidden="true" />
    </Button>
  </footer>
</div>

<ConfirmOperationAlertDialog
  open={panel.deleting !== null}
  onOpenChange={open => {
    if (!open) panel.cancelDelete();
  }}
  onContinue={() => panel.confirmDelete()}
/>
