<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';
  import AgentCompatibilityBadge from '../components/AgentCompatibilityBadge/AgentCompatibilityBadge.svelte';
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
    /** Absent: the user may not change the icon (`set_app_icon`). */
    onChangeIcon?: () => void;
  }

  let {
    agent,
    noActiveKey = false,
    onDisable,
    onEnable,
    enabling = false,
    onChangeIcon,
  }: Props = $props();

  const shortId = $derived(
    agent.id.length > 12 ? `${agent.id.slice(0, 6)}…${agent.id.slice(-3)}` : agent.id,
  );
</script>

{#snippet avatar()}
  <IdentityAvatar profile={agentProfile(agent)} kind="agent" online={agent.connected} size={48} />
{/snippet}

<!-- A click on the icon changes it, for an admin, as on the page of a project. -->
<header class="flex flex-wrap items-start gap-4">
  {#if onChangeIcon}
    <Tooltip>
      <TooltipTrigger
        aria-label={t(messages.changeIcon)}
        class="focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center justify-center rounded-[25%] transition-opacity outline-none hover:opacity-80 focus-visible:ring-[3px]"
        onclick={onChangeIcon}
      >
        {@render avatar()}
      </TooltipTrigger>
      <TooltipContent side="top">{t(messages.changeIcon)}</TooltipContent>
    </Tooltip>
  {:else}
    {@render avatar()}
  {/if}
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="truncate">{agent.name}</h1>
      <span data-tour="agent-status" data-online={agent.connected}>
        <AgentStatusPill {agent} {noActiveKey} />
      </span>
      <AgentCompatibilityBadge {agent} />
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
      <span class="hidden sm:inline" aria-hidden="true">·</span>
      {t(messages.createdOn(formatDay(agent.createdAt)))}
    </p>
  </div>
  {#if agent.disabledAt && onEnable}
    <Button onclick={onEnable} disabled={enabling}>
      <PowerIcon class="size-4" aria-hidden="true" />
      {t(messages.enable)}
    </Button>
  {:else if !agent.disabledAt && onDisable}
    <Button variant="destructive" onclick={onDisable}>
      <PowerOffIcon class="size-4" aria-hidden="true" />
      {t(messages.disable)}
    </Button>
  {/if}
</header>
