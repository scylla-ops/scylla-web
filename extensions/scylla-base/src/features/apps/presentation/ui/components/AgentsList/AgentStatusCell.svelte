<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentStatusOf } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: AppEntity;
    /** Absent: the user may not make a join code. */
    onShowCommand?: () => void;
  }

  let { agent, onShowCommand }: Props = $props();

  const status = $derived(agentStatusOf(agent));

  const label = $derived(
    {
      running: t(messages.running(agent.runningJobs)),
      online: t(messages.online),
      offline: t(messages.offline),
      never: t(messages.never),
      disabled: t(messages.disabled),
    }[status],
  );

  const DOT = {
    running: 'bg-warning',
    online: 'bg-primary',
    offline: 'bg-muted-foreground',
    never: 'border border-primary bg-transparent',
    disabled: 'border border-muted-foreground bg-transparent',
  } as const;
</script>

<div class="flex flex-col items-start gap-1">
  <span
    class={cn(
      'inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
      status === 'running' ? 'bg-warning/15' : 'bg-muted',
    )}
  >
    <span class={cn('size-2 rounded-full', DOT[status])} aria-hidden="true"></span>
    {label}
  </span>
  <span class="text-xs text-muted-foreground">
    {#if status === 'running' || status === 'online'}
      {t(messages.connected)}
    {:else if status === 'offline'}
      {t(messages.lastSeen(getRelativeTime(agent.lastSeenAt)))}
    {:else if status === 'disabled'}
      {t(messages.disabledSince(formatDay(agent.disabledAt)))}
    {:else if onShowCommand}
      <button type="button" class="text-primary hover:underline" onclick={onShowCommand}>
        {t(messages.showCommand)}
      </button>
    {/if}
  </span>
</div>
