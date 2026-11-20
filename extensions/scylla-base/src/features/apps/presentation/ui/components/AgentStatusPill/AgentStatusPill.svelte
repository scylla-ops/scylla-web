<script lang="ts">
  import { StatusShape, type StatusState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
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

  const SHAPE: Record<typeof status, StatusState> = {
    running: 'running',
    online: 'success',
    offline: 'idle',
    never: 'pending',
    disabled: 'cancelled',
    nokey: 'failed',
  };
</script>

<span class="inline-flex items-center gap-1.5 text-xs font-medium">
  <StatusShape state={SHAPE[status]} {label} size={20} />
  <span aria-hidden="true">{label}</span>
</span>
