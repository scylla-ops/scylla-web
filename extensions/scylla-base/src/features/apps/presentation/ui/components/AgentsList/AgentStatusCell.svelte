<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentStatusOf } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import AgentStatusPill from '../AgentStatusPill/AgentStatusPill.svelte';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: AppEntity;
    /** Absent: the user may not make a join code. */
    onFinishSetup?: () => void;
  }

  let { agent, onFinishSetup }: Props = $props();

  const status = $derived(agentStatusOf(agent));
</script>

<div class="flex flex-col items-start gap-1">
  <AgentStatusPill {agent} />
  <span class="text-xs text-muted-foreground">
    {#if status === 'running' || status === 'online'}
      {t(messages.connected)}
    {:else if status === 'offline'}
      {t(messages.lastSeen(getRelativeTime(agent.lastSeenAt)))}
    {:else if status === 'disabled'}
      {t(messages.disabledSince(formatDay(agent.disabledAt)))}
    {:else if onFinishSetup}
      <button type="button" class="text-primary hover:underline" onclick={onFinishSetup}>
        {t(messages.finishSetup)}
      </button>
    {/if}
  </span>
</div>
