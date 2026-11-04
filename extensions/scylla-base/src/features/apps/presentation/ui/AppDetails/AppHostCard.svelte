<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import type { MessageDescriptor } from '@lingui/core';
  import { t } from '@scylla/ui/i18n';
  import type { AppHost } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  let { host }: { host: AppHost | null } = $props();

  const rows: [MessageDescriptor, string][] = $derived(
    host
      ? [
          [appsMessages.version, host.version],
          [appsMessages.system, `${host.hostname} · ${host.os}/${host.arch}`],
          [appsMessages.cpus, host.cpuCount === null ? '—' : String(host.cpuCount)],
          [appsMessages.memory, host.totalMemoryMb === null ? '—' : `${host.totalMemoryMb} MB`],
          [appsMessages.capacity, String(host.capacity)],
          [appsMessages.containers, host.containerRuntime || t(appsMessages.noContainers)],
        ]
      : [],
  );
</script>

<Card>
  <CardHeader>
    <CardTitle><h2>{t(appsMessages.host)}</h2></CardTitle>
  </CardHeader>
  <CardContent>
    {#if host}
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
        {#each rows as [label, value], index (index)}
          <dt class="text-muted-foreground">{t(label)}</dt>
          <dd class="min-w-0 break-words">{value}</dd>
        {/each}
      </dl>
    {:else}
      <p class="text-sm text-muted-foreground">{t(appsMessages.noHost)}</p>
    {/if}
  </CardContent>
</Card>
