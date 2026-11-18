<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PlayIcon from '@lucide/svelte/icons/play';
  import ServerIcon from '@lucide/svelte/icons/server';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { Permission, can } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { Widget, type WidgetSize, WidgetState, type LucideIcon } from '@scylla/ui';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { createRunPipeline } from '@base/features/pipeline';
  import { triggerMutations } from '@base/features/triggers';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { quickActionMessages } from '@base/features/dashboard/presentation/messages/quick-actions.messages.ts';
  import type { ScheduleTrigger } from '@base/features/dashboard/domain/structs/schedule.struct.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 'm', editing }: Props = $props();

  type ActionId = 'run' | 'fire' | 'agent' | 'invite' | 'secret';

  interface Action {
    id: ActionId;
    label: string;
    icon: Component;
  }

  const SMALL_ACTIONS = 4;

  const runner = createRunPipeline();
  let fireTarget = $state<ScheduleTrigger | null>(null);
  const fireNow = createMutation(() => triggerMutations.fireNow(fireTarget?.pipelineId ?? ''));

  let picking = $state<ActionId | null>(null);

  const pipelines = $derived([...(widgets.summaries.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
  const triggers = $derived([...(widgets.schedules.data?.triggers ?? [])].sort((a, b) => a.pipelineName.localeCompare(b.pipelineName)));

  const actions = $derived(
    (
      [
        can(Permission.RUN_PIPELINE) && widgets.canReadPipelines && { id: 'run', label: t(messages.runPipeline), icon: PlayIcon },
        can(Permission.MANAGE_TRIGGERS) && { id: 'fire', label: t(quickActionMessages.fireTrigger), icon: ZapIcon },
        can(Permission.CREATE_APP) && { id: 'agent', label: t(messages.addAgent), icon: ServerIcon },
        can(Permission.ADD_WORKSPACE_MEMBER) && { id: 'invite', label: t(messages.inviteMember), icon: UserPlusIcon },
        can(Permission.CREATE_SECRET) && { id: 'secret', label: t(quickActionMessages.addSecret), icon: KeyRoundIcon },
      ] as (Action | false)[]
    ).filter((item): item is Action => !!item),
  );
  const shown = $derived(size === 's' ? actions.slice(0, SMALL_ACTIONS) : actions);

  const go = (id: ActionId) => {
    if (id === 'agent') scyllaNavigate.goToWorkspaceRoute('/agents/new');
    if (id === 'invite') scyllaNavigate.goToWorkspaceRoute('/members');
    if (id === 'secret') scyllaNavigate.goToWorkspaceRoute('/secrets');
  };

  const run = (pipelineId: string) => {
    picking = null;
    void runner.run(pipelineId);
  };

  const fire = (trigger: ScheduleTrigger) => {
    picking = null;
    fireTarget = trigger;
    contextStore.getState().setProject(trigger.projectId, trigger.projectName);
    fireNow.mutate(trigger.id);
  };
</script>

{#snippet face(action: Action, props: Record<string, unknown> = {})}
  {@const Icon = action.icon}
  {#if size === 'xs'}
    <Button variant="outline" size="icon" class="size-8" aria-label={action.label} title={action.label} {...props}>
      <Icon aria-hidden="true" />
    </Button>
  {:else}
    <Button variant="outline" size={size === 's' ? 'sm' : 'default'} class={cn(size === 's' ? 'h-7 w-full text-xs' : 'w-[166px]')} {...props}>
      <Icon aria-hidden="true" />
      {action.label}
    </Button>
  {/if}
{/snippet}

{#snippet picker(action: Action, items: { id: string; name: string; detail: string }[], onPick: (id: string) => void, empty: string)}
  <Popover open={picking === action.id} onOpenChange={open => (picking = open ? action.id : null)}>
    <PopoverTrigger>
      {#snippet child({ props })}{@render face(action, props)}{/snippet}
    </PopoverTrigger>
    <PopoverContent align="start" class="w-64 p-1">
      <p class="px-2 py-1.5 text-xs text-muted-foreground">{action.label}</p>
      <ul class="relative max-h-64 overflow-y-auto">
        {#each items as item (item.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onclick={() => onPick(item.id)}
            >
              <span class="truncate">{item.name}</span>
              <span class="ml-auto truncate text-xs text-muted-foreground">{item.detail}</span>
            </button>
          </li>
        {:else}
          <li class="px-2 py-1.5 text-sm text-muted-foreground">{empty}</li>
        {/each}
      </ul>
    </PopoverContent>
  </Popover>
{/snippet}

<Widget {size} {editing} title={t(messages.quickActions)} icon={ZapIcon as LucideIcon}>
  {#if actions.length === 0}
    <WidgetState state="locked" {size} description={t(messages.noActionAllowed)} />
  {:else}
    <div
      data-part="quick-actions"
      class={cn(
        'flex flex-1',
        size === 'xs' && 'items-center gap-2',
        size === 's' && 'flex-col gap-1.5',
        size !== 'xs' && size !== 's' && 'flex-wrap content-center justify-center gap-2',
      )}
    >
      {#each shown as action (action.id)}
        {#if action.id === 'run'}
          {@render picker(
            action,
            pipelines.map(item => ({ id: item.id, name: item.name, detail: item.projectName })),
            run,
            t(messages.noPipelinesYet),
          )}
        {:else if action.id === 'fire'}
          {@render picker(
            action,
            triggers.map(item => ({ id: item.id, name: item.pipelineName, detail: item.name })),
            id => {
              const trigger = triggers.find(item => item.id === id);
              if (trigger) fire(trigger);
            },
            t(quickActionMessages.noTrigger),
          )}
        {:else}
          {@render face(action, { onclick: () => go(action.id) })}
        {/if}
      {/each}
    </div>
  {/if}
</Widget>
