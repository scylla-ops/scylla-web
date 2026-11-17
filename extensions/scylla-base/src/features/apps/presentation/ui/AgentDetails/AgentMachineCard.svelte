<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { createQuery } from '@scylla/core-sdk';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatTime } from '@shared/utils/date-utils.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import {
    type AppEntity,
    featureFixOf,
    needsUpdate,
  } from '@base/features/apps/domain/entities/app.entity.ts';
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
  const otherVersion = $derived(
    !!agent.host && !!server.data?.version && agent.host.version !== server.data.version,
  );
  const update = $derived(agent.host ? updateCommand(serverAddress, agent.host.os) : null);

  // The protocol tells if the agent can run each job: the version text can be the same.
  const updateReason = $derived.by((): MessageDescriptor | null => {
    const host = agent.host;
    if (!host) return null;
    const range = server.data?.agentProtocol;
    if (needsUpdate(agent))
      return agent.compatibility === 'unsupported'
        ? messages.protocolRefused(host.protocol, range?.min ?? host.protocol + 1)
        : messages.protocolOutdated(host.protocol, range?.current ?? host.protocol + 1);
    if (otherVersion && server.data) return messages.newVersion(host.version, server.data.version);
    return null;
  });

  const protocol = $derived(
    agent.host
      ? [String(agent.host.protocol), agent.host.build.slice(0, 7)].filter(Boolean).join(' · ')
      : '',
  );

  const missing = $derived(
    agent.host
      ? agent.missingFeatures.map((feature) => {
          const fix = featureFixOf(agent.host ?? { protocol: 0 }, feature);
          return {
            feature,
            fix: fix === 'install-git' ? messages.installGit : messages.updateForFeature,
          };
        })
      : [],
  );

  const rows = $derived.by((): [MessageDescriptor, string, boolean][] => {
    const host = agent.host;
    if (!host) return [];
    return [
      [messages.hostname, host.hostname, false],
      [messages.system, `${host.os} / ${host.arch}`, false],
      [messages.agentVersion, host.version, true],
      [messages.protocol, protocol, true],
      [messages.cpus, host.cpuCount === null ? '–' : String(host.cpuCount), false],
      [
        messages.memory,
        host.totalMemoryMb === null ? '–' : `${Math.round(host.totalMemoryMb / 1024)} GB`,
        false,
      ],
      [messages.jobsAtOnce, String(host.capacity), false],
      [messages.runtime, host.containerRuntime || t(messages.noRuntime), !!host.containerRuntime],
      [messages.features, host.features.join(', ') || t(messages.noFeature), host.features.length > 0],
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
      {#if missing.length}
        <div class="mt-4 flex flex-col gap-2 border-t pt-4 text-xs">
          <p class="text-muted-foreground">{t(messages.missingFeatures)}</p>
          <ul class="flex flex-col gap-2">
            {#each missing as item (item.feature)}
              <li class="flex items-center justify-between gap-3">
                <span class="font-mono">{item.feature}</span>
                <span class="text-right">{t(item.fix)}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if updateReason}
        <div class="mt-4 flex flex-col gap-2 border-t pt-4">
          <p class="text-xs">{t(updateReason)}</p>
          {#if update}
            <CopyBox
              value={update}
              caption={t(messages.installedWithScript)}
              copyToast={t(addAgentMessages.copied)}
            />
          {/if}
          {#if agent.host?.os === 'linux' && server.data}
            <CopyBox
              value={dockerUpdateCommand(server.data.agentImage)}
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
