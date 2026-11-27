<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import { swapIn, swapOut } from '@scylla/ui';
  import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';
  import AppHeaderMenu from '../components/AppHeaderMenu.svelte';

  interface Props {
    app: AppEntity;
    /** Absent: the user may not change the icon (`set_app_icon`). */
    onChangeIcon?: () => void;
    /** Absent: the user may not disable, enable or delete the app. */
    onDisable?: () => void;
    onEnable?: () => void;
    onDelete?: () => void;
  }

  let { app, onChangeIcon, onDisable, onEnable, onDelete }: Props = $props();

  const iconKey = $derived(JSON.stringify(app.icon ?? null));
  const shortId = $derived(
    app.id.length > 12 ? `${app.id.slice(0, 6)}…${app.id.slice(-3)}` : app.id,
  );
</script>

{#snippet avatar()}
  <!-- The icon that an admin chose; a new one fades in over the old one. -->
  <span class="grid shrink-0 place-items-center">
    {#key iconKey}
      <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
        <IdentityAvatar profile={agentProfile(app)} kind="app" size={48} />
      </span>
    {/key}
  </span>
{/snippet}

<!-- A click on the icon changes it, for an admin, as on the page of an agent. -->
<header
  class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:gap-y-1.5"
>
  <div class="flex sm:row-span-2">
    {#if onChangeIcon}
      <Tooltip>
        <TooltipTrigger
          aria-label={t(agentPageMessages.changeIcon)}
          class="focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center justify-center rounded-[25%] transition-opacity outline-none hover:opacity-80 focus-visible:ring-[3px]"
          onclick={onChangeIcon}
        >
          {@render avatar()}
        </TooltipTrigger>
        <TooltipContent side="top">{t(agentPageMessages.changeIcon)}</TooltipContent>
      </Tooltip>
    {:else}
      {@render avatar()}
    {/if}
  </div>
  <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:self-end">
    <h1 class="min-w-0 truncate">{app.name}</h1>
    <Badge variant="outline">{t(messages.appBadge)}</Badge>
    {#if app.disabledAt}
      <Badge variant="secondary">{t(agentsListMessages.disabled)}</Badge>
    {/if}
  </div>
  <div class="flex sm:row-span-2">
    <AppHeaderMenu
      {app}
      deleteLabel={t(messages.deleteAppMenu)}
      {onChangeIcon}
      {onDisable}
      {onEnable}
      {onDelete}
    />
  </div>
  <p
    class="col-span-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:self-start"
  >
    <span class="flex items-center gap-1.5">
      {t(agentPageMessages.id)}
      <span class="font-mono text-foreground" title={app.id}>{shortId}</span>
      <button
        type="button"
        class="flex size-5 items-center justify-center rounded hover:bg-muted"
        aria-label={t(agentPageMessages.copyId)}
        onclick={() => copyToClipboard(app.id, { copied: t(agentsListMessages.idCopied) })}
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
      </button>
    </span>
    <span aria-hidden="true">·</span>
    <span>{t(agentPageMessages.createdOn(formatDay(app.createdAt)))}</span>
  </p>
</header>
