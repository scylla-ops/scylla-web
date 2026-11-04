<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentStatusOf } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: Pick<AppEntity, 'runner' | 'connected' | 'lastSeenAt' | 'runningJobs' | 'disabledAt'>;
    /** Each key is revoked: shown in place of offline. */
    noActiveKey?: boolean;
  }

  let { agent, noActiveKey = false }: Props = $props();

  const status = $derived.by(() => {
    const base = agentStatusOf(agent);
    return noActiveKey && (base === 'offline' || base === 'never') ? 'nokey' : base;
  });

  const label = $derived(
    {
      running: t(messages.running(agent.runningJobs)),
      online: t(messages.online),
      offline: t(messages.offline),
      never: t(messages.never),
      disabled: t(messages.disabled),
      nokey: t(messages.noActiveKey),
    }[status],
  );

  const DOT = {
    running: 'bg-warning',
    online: 'bg-primary',
    offline: 'bg-muted-foreground',
    never: 'border border-primary bg-transparent',
    disabled: 'border border-muted-foreground bg-transparent',
    nokey: 'bg-destructive',
  } as const;
</script>

<span
  class={cn(
    'inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
    status === 'running' ? 'bg-warning/15' : status === 'nokey' ? 'bg-destructive/15' : 'bg-muted',
  )}
>
  <span class={cn('size-2 rounded-full', DOT[status])} aria-hidden="true"></span>
  {label}
</span>
