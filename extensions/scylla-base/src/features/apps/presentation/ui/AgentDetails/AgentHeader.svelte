<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import AgentStatusPill from '../components/AgentStatusPill/AgentStatusPill.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: AppEntity;
    /** Each key is revoked. */
    noActiveKey?: boolean;
    /** Absent: the user may not disable or enable the agent. */
    onDisable?: () => void;
    onEnable?: () => void;
    enabling?: boolean;
  }

  let { agent, noActiveKey = false, onDisable, onEnable, enabling = false }: Props = $props();

  const shortId = $derived(
    agent.id.length > 12 ? `${agent.id.slice(0, 6)}…${agent.id.slice(-3)}` : agent.id,
  );
</script>

<header class="flex flex-wrap items-start gap-4">
  <span
    class="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted"
    aria-hidden="true"
  >
    <BotIcon class="size-5" />
  </span>
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="truncate text-2xl font-medium">{agent.name}</h1>
      <span data-tour="agent-status" data-online={agent.connected}>
        <AgentStatusPill {agent} {noActiveKey} />
      </span>
    </div>
    <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {t(messages.id)}
      <span class="font-mono text-foreground" title={agent.id}>{shortId}</span>
      <button
        type="button"
        class="rounded p-0.5 hover:bg-muted"
        aria-label={t(messages.copyId)}
        onclick={() => copyToClipboard(agent.id, { copied: t(agentsListMessages.idCopied) })}
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
      </button>
      · {t(messages.createdOn(formatDay(agent.createdAt)))}
    </p>
  </div>
  {#if agent.disabledAt && onEnable}
    <Button onclick={onEnable} disabled={enabling}>
      <PowerIcon class="size-4" aria-hidden="true" />
      {t(messages.enable)}
    </Button>
  {:else if !agent.disabledAt && onDisable}
    <Button variant="outline" onclick={onDisable}>
      <PowerOffIcon class="size-4" aria-hidden="true" />
      {t(messages.disable)}
    </Button>
  {/if}
</header>
