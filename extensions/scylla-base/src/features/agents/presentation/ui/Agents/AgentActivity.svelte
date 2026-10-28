<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type {
    AgentEntity,
    AgentState,
  } from '@base/features/agents/domain/entities/agent.entity.ts';
  import AgentStateDot from '../components/AgentStateDot.svelte';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import { agentsPageMessages as messages } from '@base/features/agents/presentation/messages/agents-page.messages.ts';

  interface Props {
    agent: AgentEntity;
    state: AgentState;
    /** A ticking timestamp: the relative times follow it. */
    now: number;
    canReset: boolean;
    onShowRunCommand: () => void;
  }

  let { agent, state, now, canReset, onShowRunCommand }: Props = $props();

  const label = $derived(
    {
      idle: t(agentsMessages.stateIdle),
      running: t(agentsMessages.stateRunning(agent.inFlight)),
      offline: t(agentsMessages.stateOffline),
      never: t(agentsMessages.stateNever),
      disabled: t(agentsMessages.stateDisabled),
    }[state],
  );

  const lastSeen = $derived.by(() => {
    void now;
    return t(agentsMessages.lastSeenAgo(getRelativeTime(agent.lastSeen)));
  });
</script>

<div class="flex min-w-0 flex-col gap-1">
  <span class="flex items-center gap-2 text-sm font-medium">
    <AgentStateDot {state} />
    {label}
  </span>
  <span class="pl-4 text-xs text-muted-foreground">
    {#if state === 'idle' || state === 'running'}
      {t(agentsMessages.connected)}
    {:else if state === 'offline'}
      {lastSeen}
    {:else if state === 'disabled'}
      {t(messages.disabledSince(formatDay(agent.updatedAt)))}
    {:else if canReset}
      <Button
        variant="link"
        class="h-auto p-0 text-xs hover:scale-100"
        onclick={(event: MouseEvent) => {
          event.stopPropagation();
          onShowRunCommand();
        }}
      >
        {t(messages.showRunCommand)}
      </Button>
    {:else}
      {t(messages.waitingFirstConnection)}
    {/if}
  </span>
</div>
