<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ServerIcon from '@lucide/svelte/icons/server';
  import type { MessageDescriptor } from '@lingui/core';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { memoryText } from '@base/features/apps/presentation/presenters/agent-figures.presenter.ts';

  interface Props {
    agent: AppEntity;
    /** Opens the Machine tab. */
    onDetails: () => void;
  }

  let { agent, onDetails }: Props = $props();
</script>

{#snippet fact(label: MessageDescriptor, value: string)}
  <dt class="text-muted-foreground">{t(label)}</dt>
  <dd class="min-w-0 truncate text-right" title={value}>{value}</dd>
{/snippet}

{#if agent.host}
  {@const host = agent.host}
  <!-- A phone shows one line that opens the Machine tab. -->
  <button
    type="button"
    class="flex min-h-12 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left text-sm sm:hidden"
    onclick={onDetails}
  >
    <ServerIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">
      <span class="sr-only">{t(messages.machine)}:</span>
      {host.hostname} · {host.os} / {host.arch}
    </span>
    <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </button>
{/if}
<Card class={cn('gap-4', agent.host && 'max-sm:hidden')}>
  <CardHeader class="flex flex-row items-center justify-between gap-3">
    <CardTitle><h2>{t(messages.machine)}</h2></CardTitle>
    <Button variant="ghost" size="sm" class="-my-1" onclick={onDetails}>
      {t(messages.details)}
      <ChevronRightIcon class="size-4" aria-hidden="true" />
    </Button>
  </CardHeader>
  <CardContent>
    {#if agent.host}
      {@const host = agent.host}
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 text-xs">
        {@render fact(messages.hostname, host.hostname)}
        {@render fact(messages.system, `${host.os} / ${host.arch}`)}
        {@render fact(messages.agentVersion, host.version)}
        {@render fact(messages.cpus, host.cpuCount === null ? '–' : String(host.cpuCount))}
        {@render fact(
          messages.memory,
          host.totalMemoryMb === null ? '–' : memoryText(host.totalMemoryMb),
        )}
      </dl>
    {:else}
      <p class="text-sm text-muted-foreground">{t(messages.neverSaidHello)}</p>
    {/if}
  </CardContent>
</Card>
