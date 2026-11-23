<script lang="ts">
  import ContainerIcon from '@lucide/svelte/icons/container';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import type { MessageDescriptor } from '@lingui/core';
  import { createQuery } from '@scylla/core-sdk';
  import {
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatTime } from '@shared/utils/date-utils.ts';
  import { type AppEntity, needsUpdate } from '@base/features/apps/domain/entities/app.entity.ts';
  import { releaseOf } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
  import { memoryText } from '@base/features/apps/presentation/presenters/agent-figures.presenter.ts';
  import FeatureBadges from './FeatureBadges.svelte';
  import UpdateCommands from './UpdateCommands.svelte';

  let { agent }: { agent: AppEntity } = $props();

  const server = createQuery(() => appQueries.server());
  const outdated = $derived(needsUpdate(agent));
  const refused = $derived(agent.compatibility === 'unsupported');
  // A build that is not a release adds its commit to its version, and installs the same release.
  const otherVersion = $derived(
    !!agent.host &&
      !!server.data?.version &&
      releaseOf(agent.host.version) !== releaseOf(server.data.version),
  );
</script>

{#snippet text(value: string)}
  <span class="[text-box:trim-both_cap_alphabetic]">{value}</span>
{/snippet}

{#snippet fact(label: MessageDescriptor, value: string, mono = false)}
  <dt class="text-muted-foreground">{t(label)}</dt>
  <dd class="min-w-0 text-right break-words {mono ? 'font-mono' : ''}">{value}</dd>
{/snippet}

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
    {#if agent.host}
      {@const host = agent.host}
      <dl
        class="grid auto-rows-[minmax(18px,auto)] grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-xs"
      >
        {@render fact(messages.hostname, host.hostname)}
        {@render fact(messages.system, `${host.os} / ${host.arch}`)}
        {#if outdated}
          <dt class="text-muted-foreground">{t(messages.agentVersion)}</dt>
          <dd class="flex items-center justify-end">
            <Tooltip>
              <TooltipTrigger>
                {#snippet child({ props })}
                  <Badge
                    {...props}
                    tabindex={0}
                    variant={refused ? 'destructive' : 'warning'}
                    class="h-4.5"
                  >
                    <TriangleAlertIcon aria-hidden="true" />
                    {@render text(host.version)}
                  </Badge>
                {/snippet}
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t(
                    refused
                      ? agentsListMessages.incompatibleHint
                      : agentsListMessages.updateNeededHint,
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </dd>
          <dt class="text-muted-foreground">{t(messages.serverVersion)}</dt>
          <dd class="flex items-center justify-end">
            <Badge variant="secondary" class="h-4.5">
              {@render text(server.data?.version ?? '–')}
            </Badge>
          </dd>
        {:else}
          {@render fact(messages.agentVersion, host.version, true)}
          {@render fact(messages.serverVersion, server.data?.version ?? '–', true)}
        {/if}
        {@render fact(messages.cpus, host.cpuCount === null ? '–' : String(host.cpuCount))}
        {@render fact(
          messages.memory,
          host.totalMemoryMb === null ? '–' : memoryText(host.totalMemoryMb),
        )}
        {@render fact(messages.jobsAtOnce, String(host.capacity))}
        <dt class="text-muted-foreground">{t(messages.runtime)}</dt>
        <dd class="flex items-center justify-end">
          {#if host.containerRuntime}
            <Badge variant="secondary" class="h-4.5">
              <ContainerIcon aria-hidden="true" />
              {@render text(host.containerRuntime)}
            </Badge>
          {:else}
            <Badge variant="secondary" class="h-4.5 text-muted-foreground">
              {@render text(t(messages.noRuntime))}
            </Badge>
          {/if}
        </dd>
        <dt class="text-muted-foreground">{t(messages.features)}</dt>
        <dd class="flex flex-wrap items-center justify-end gap-1">
          <FeatureBadges {host} missing={agent.missingFeatures} />
        </dd>
      </dl>
      {#if outdated || otherVersion}
        <UpdateCommands {host} {outdated} server={server.data} />
      {/if}
    {:else}
      <p class="text-sm text-muted-foreground">{t(messages.neverSaidHello)}</p>
    {/if}
  </CardContent>
</Card>
