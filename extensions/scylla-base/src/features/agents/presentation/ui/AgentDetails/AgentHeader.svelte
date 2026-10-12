<script lang="ts">
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import {
    isOnline,
    type AgentState,
  } from '@base/features/agents/domain/structs/agent-state.struct.ts';
  import type {
    AgentActions,
  } from '@base/features/agents/presentation/agent-actions.state.svelte.ts';
  import { formatDayTime } from '@base/features/agents/presentation/utils/agent-format.ts';
  import AgentActionsMenu from '../components/AgentActionsMenu.svelte';
  import AgentBot from '../components/AgentBot/AgentBot.svelte';
  import AgentIdLink from '../components/AgentIdLink/AgentIdLink.svelte';
  import AgentStateDot from '../components/AgentStateDot.svelte';
  import { agentsMessages } from '../agents.messages.ts';
  import { agentDetailsMessages as messages } from './agent-details.messages.ts';

  interface Props {
    agent: AgentEntity;
    state: AgentState;
    now: number;
    actions: AgentActions;
  }

  let { agent, state, now, actions }: Props = $props();

  const chip = $derived(
    {
      idle: t(agentsMessages.stateOnlineIdle),
      running: t(agentsMessages.stateRunning(agent.inFlight)),
      offline: t(agentsMessages.stateOffline),
      never: t(agentsMessages.stateNever),
      disabled: t(agentsMessages.stateDisabled),
    }[state],
  );

  /** `last_seen` moves only on events: a connected agent is just "Connected". */
  const activity = $derived.by(() => {
    void now;
    if (state === 'disabled') {
      return t(messages.disabledOn(formatDayTime(agent.updatedAt, activeLocale())));
    }
    if (isOnline(state)) return t(agentsMessages.connected);
    if (state === 'offline') return t(agentsMessages.lastSeenAgo(getRelativeTime(agent.lastSeen)));
    return null;
  });
</script>

<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
  <div
    data-tour="agent-status"
    data-online={isOnline(state)}
    class="flex min-w-0 items-center gap-4"
  >
    <AgentBot {state} size="lg" />
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="truncate text-2xl font-semibold tracking-tight">{agent.name}</h1>
        <Badge variant="outline" class="gap-1.5 font-medium">
          <AgentStateDot {state} />
          {chip}
        </Badge>
      </div>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <AgentIdLink id={agent.id} />
        {#if activity}
          <span aria-hidden="true">·</span>
          <span>{activity}</span>
        {/if}
        <span aria-hidden="true">·</span>
        <span>{t(agentsMessages.createdOn(formatDay(agent.createdAt)))}</span>
      </div>
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    {#if actions.canReset}
      <Button variant="outline" onclick={() => actions.requestReset(agent)}>
        <KeyRoundIcon />
        {t(agentsMessages.resetSecret)}
      </Button>
    {/if}
    {#if actions.canToggle}
      {#if agent.isActive}
        <Button variant="outline" onclick={() => actions.requestDisable(agent)}>
          <PowerOffIcon />
          {t(agentsMessages.disable)}
        </Button>
      {:else}
        <Button onclick={() => actions.enable(agent)} disabled={actions.isToggling}>
          <PowerIcon />
          {t(agentsMessages.enable)}
        </Button>
      {/if}
    {/if}
    <AgentActionsMenu {agent} {actions} variant="header" />
  </div>
</div>
