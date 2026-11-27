<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import { swapIn, swapOut } from '@scylla/ui';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';
  import AgentCompatibilityBadge from '../components/AgentCompatibilityBadge/AgentCompatibilityBadge.svelte';
  import AgentStatusPill from '../components/AgentStatusPill/AgentStatusPill.svelte';
  import AppHeaderMenu from '../components/AppHeaderMenu.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: AppEntity;
    /** Each key is revoked. */
    noActiveKey?: boolean;
    /** Absent: the user may not change the icon (`set_app_icon`). */
    onChangeIcon?: () => void;
    /** Absent: the user may not make a join code. */
    onConnect?: () => void;
    /** Absent: the user may not disable, enable or delete the agent. */
    onDisable?: () => void;
    onEnable?: () => void;
    onDelete?: () => void;
  }

  let {
    agent,
    noActiveKey = false,
    onChangeIcon,
    onConnect,
    onDisable,
    onEnable,
    onDelete,
  }: Props = $props();

  const iconKey = $derived(JSON.stringify(agent.icon ?? null));
  const shortId = $derived(
    agent.id.length > 12 ? `${agent.id.slice(0, 6)}…${agent.id.slice(-3)}` : agent.id,
  );
</script>

{#snippet avatar()}
  <!-- A new icon fades in over the old one, as on the page of an app. -->
  <span class="grid shrink-0 place-items-center">
    {#key iconKey}
      <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
        <IdentityAvatar
          profile={agentProfile(agent)}
          kind="agent"
          online={agent.connected}
          size={48}
        />
      </span>
    {/key}
  </span>
{/snippet}

<!--
  The icon, the text and the menu are centered on one line. The status is centered on the line of
  the name: its wrapper is a flex box too, so no line box of text adds room under it. On a phone,
  the line of the ID goes under the icon, at the full width: the header keeps 3 lines.
-->
<header
  class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:gap-y-1.5"
>
  <div class="flex sm:row-span-2">
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
  </div>
  <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:self-end">
    <h1 class="min-w-0 truncate">{agent.name}</h1>
    <span
      class="flex items-center gap-2"
      data-tour="agent-status"
      data-online={agent.connected}
    >
      <AgentStatusPill {agent} {noActiveKey} />
      <AgentCompatibilityBadge {agent} />
    </span>
  </div>
  <div class="flex sm:row-span-2">
    <AppHeaderMenu
      app={agent}
      deleteLabel={t(messages.deleteAgentMenu)}
      {onChangeIcon}
      {onConnect}
      {onDisable}
      {onEnable}
      {onDelete}
    />
  </div>
  <p
    class="col-span-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:self-start"
  >
    <span class="flex items-center gap-1.5">
      {t(messages.id)}
      <span class="font-mono text-foreground" title={agent.id}>{shortId}</span>
      <button
        type="button"
        class="flex size-5 items-center justify-center rounded hover:bg-muted"
        aria-label={t(messages.copyId)}
        onclick={() => copyToClipboard(agent.id, { copied: t(agentsListMessages.idCopied) })}
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
      </button>
    </span>
    <span aria-hidden="true">·</span>
    <span>{t(messages.createdOn(formatDay(agent.createdAt)))}</span>
  </p>
</header>
