<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import type { CreatedAgent } from '@base/features/agents/domain/structs/agent.struct.ts';
  import { memoryAmount } from '@base/features/agents/presentation/utils/agent-format.ts';
  import { agentsMessages } from '../../agents.messages.ts';
  import AgentBot from '../AgentBot/AgentBot.svelte';
  import AgentRunCommand from '../AgentRunCommand/AgentRunCommand.svelte';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { createAgentMessages as messages } from './create-agent.messages.ts';

  interface Props {
    created: CreatedAgent;
    grantFailed: boolean;
    /** Without `READ_APP` there is no live status. */
    canWatch: boolean;
    liveAgent: AgentEntity | undefined;
    connected: boolean;
  }

  let { created, grantFailed, canWatch, liveAgent, connected }: Props = $props();

  let revealed = $state(false);

  const hostLine = $derived.by(() => {
    const host = liveAgent?.host;
    if (!host) return t(messages.waitsForJobs);
    const parts = [`${host.os}/${host.arch}`];
    if (host.cpuCount !== null) parts.push(t(agentsMessages.cpuCount(host.cpuCount)));
    if (host.totalMemoryMb !== null) {
      const { amount, unit } = memoryAmount(host.totalMemoryMb);
      parts.push(
        t(unit === 'GB' ? agentsMessages.memoryGb(amount) : agentsMessages.memoryMb(amount)),
      );
    }
    if (host.version) parts.push(t(messages.agentVersion(host.version)));
    return t(messages.hostWaitsForJobs(parts.join(' · ')));
  });
</script>

<div class="flex flex-col gap-2">
  {#if grantFailed}
    <div
      role="alert"
      class="mb-3 flex items-start gap-2.5 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2.5"
    >
      <TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div class="flex flex-col gap-0.5">
        <p class="text-sm font-medium">{t(messages.grantFailedTitle)}</p>
        <p class="text-xs text-muted-foreground">{t(messages.grantFailedBody)}</p>
      </div>
    </div>
  {/if}

  <div class="flex items-center gap-2">
    <span class="text-sm font-medium">{t(messages.secret)}</span>
    <Badge variant="outline" class="font-normal">{t(agentsMessages.shownOneTime)}</Badge>
  </div>
  <div data-tour="agent-secret">
    <CopyBox
      value={created.secret}
      secret={created.secret}
      bind:revealed
      copyToast={t(messages.secretCopied)}
      focusOnMount
    />
  </div>
  <p class="mb-4 text-xs text-muted-foreground">{t(messages.secretHelp)}</p>

  <AgentRunCommand appId={created.agent.id} secret={created.secret} {revealed} />

  {#if canWatch}
    <div
      role="status"
      data-connected={connected}
      class={cn(
        'mt-3 flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors duration-300',
        connected ? 'border-success/70' : 'border-dashed border-warning/70',
      )}
    >
      <AgentBot state={connected ? 'idle' : 'never'} size="sm" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        {#if connected}
          <p class="truncate text-sm font-medium">
            {liveAgent?.host?.hostname
              ? t(messages.connectedFrom(liveAgent.host.hostname))
              : t(messages.connected)}
          </p>
          <p class="truncate text-xs text-muted-foreground">{hostLine}</p>
        {:else}
          <p class="text-sm font-medium">{t(messages.waiting)}</p>
          <p class="text-xs text-muted-foreground">{t(messages.waitingHelp)}</p>
        {/if}
      </div>
      {#if connected}
        <CircleCheckIcon class="size-5 shrink-0 text-success" aria-hidden="true" />
      {/if}
    </div>
  {/if}
</div>
