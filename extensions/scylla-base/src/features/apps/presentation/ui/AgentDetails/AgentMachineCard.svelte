<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatTime } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  let { agent }: { agent: AppEntity } = $props();

  const rows = $derived.by((): [MessageDescriptor, string, boolean][] => {
    const host = agent.host;
    if (!host) return [];
    return [
      [messages.hostname, host.hostname, false],
      [messages.system, `${host.os} / ${host.arch}`, false],
      [messages.agentVersion, host.version, true],
      [messages.cpus, host.cpuCount === null ? '–' : String(host.cpuCount), false],
      [
        messages.memory,
        host.totalMemoryMb === null ? '–' : `${Math.round(host.totalMemoryMb / 1024)} GB`,
        false,
      ],
      [messages.jobsAtOnce, String(host.capacity), false],
      [messages.runtime, host.containerRuntime || t(messages.noRuntime), !!host.containerRuntime],
    ];
  });
</script>

<Card class="h-full">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.machine)}</h2></CardTitle>
    {#if agent.lastSeenAt}
      <span class="text-xs text-muted-foreground">
        {t(messages.helloAt(formatTime(agent.lastSeenAt)))}
      </span>
    {/if}
  </CardHeader>
  <CardContent>
    {#if rows.length}
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-xs">
        {#each rows as [label, value, mono], index (index)}
          <dt class="text-muted-foreground">{t(label)}</dt>
          <dd class="min-w-0 text-right break-words {mono ? 'font-mono' : ''}">{value}</dd>
        {/each}
      </dl>
    {:else}
      <p class="text-sm text-muted-foreground">{t(messages.neverSaidHello)}</p>
    {/if}
  </CardContent>
</Card>
