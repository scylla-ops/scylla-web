<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { createQuery } from '@scylla/core-sdk';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatTime } from '@shared/utils/date-utils.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    dockerUpdateCommand,
    updateCommand,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { addAgentMessages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  let { agent }: { agent: AppEntity } = $props();

  const serverAddress: string = import.meta.env.VITE_API_URL || window.location.origin;
  const server = createQuery(() => appQueries.server());
  const newVersion = $derived(
    agent.host && server.data?.version && agent.host.version !== server.data.version
      ? server.data
      : null,
  );
  const update = $derived(agent.host ? updateCommand(serverAddress, agent.host.os) : null);

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
      {#if agent.host && newVersion}
        <div class="mt-4 flex flex-col gap-2 border-t pt-4">
          <p class="text-xs">{t(messages.newVersion(agent.host.version, newVersion.version))}</p>
          {#if update}
            <CopyBox
              value={update}
              caption={t(messages.installedWithScript)}
              copyToast={t(addAgentMessages.copied)}
            />
          {/if}
          {#if agent.host.os === 'linux'}
            <CopyBox
              value={dockerUpdateCommand(newVersion.agentImage)}
              caption={t(messages.updateInDocker)}
              layout="lines"
              copyToast={t(addAgentMessages.copied)}
            />
          {/if}
        </div>
      {/if}
    {:else}
      <p class="text-sm text-muted-foreground">{t(messages.neverSaidHello)}</p>
    {/if}
  </CardContent>
</Card>
