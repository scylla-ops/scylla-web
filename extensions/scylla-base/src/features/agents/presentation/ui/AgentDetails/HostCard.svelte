<script lang="ts">
  import ServerIcon from '@lucide/svelte/icons/server';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AgentHost } from '@base/features/agents/domain/entities/agent.entity.ts';
  import { memoryAmount } from '@base/features/agents/presentation/utils/agent-format.ts';
  import { agentsMessages } from '../agents.messages.ts';
  import { agentDetailsMessages as messages } from './agent-details.messages.ts';

  interface Props {
    host: AgentHost | null;
    now: number;
  }

  let { host, now }: Props = $props();

  const memory = $derived.by(() => {
    if (host?.totalMemoryMb == null) return t(messages.unknown);
    const { amount, unit } = memoryAmount(host.totalMemoryMb);
    return t(unit === 'GB' ? agentsMessages.memoryGb(amount) : agentsMessages.memoryMb(amount));
  });

  const rows = $derived(
    host
      ? [
          { key: 'hostname', label: t(messages.hostname), value: host.hostname, mono: false },
          {
            key: 'system',
            label: t(messages.system),
            value: `${host.os}/${host.arch}`,
            mono: false,
          },
          { key: 'version', label: t(messages.agentVersion), value: host.version, mono: true },
          {
            key: 'cpus',
            label: t(messages.cpus),
            value: host.cpuCount === null ? t(messages.unknown) : String(host.cpuCount),
            mono: false,
          },
          { key: 'memory', label: t(messages.memory), value: memory, mono: false },
        ]
      : [],
  );

  const reported = $derived.by(() => {
    void now;
    return host?.reportedAt ? t(messages.fromLastHello(getRelativeTime(host.reportedAt))) : '';
  });
</script>

<Card class="gap-4 px-5 py-5">
  <div class="flex items-start justify-between gap-3">
    <div class="flex flex-col gap-1">
      <h2 class="text-sm font-semibold">{t(messages.host)}</h2>
      <p class="text-xs text-muted-foreground">
        {host ? reported : t(agentsMessages.notReportedYet)}
      </p>
    </div>
    <ServerIcon class="size-4 text-muted-foreground" aria-hidden="true" />
  </div>
  {#if host}
    <dl class="flex flex-col gap-3 text-sm">
      {#each rows as row (row.key)}
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-foreground">{row.label}</dt>
          <dd class={row.mono ? 'truncate font-mono text-xs' : 'truncate font-medium'}>{row.value}</dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-sm text-muted-foreground">{t(messages.hostAfterHello)}</p>
  {/if}
</Card>
