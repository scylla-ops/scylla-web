<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import { swapIn, swapOut } from '@scylla/ui';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';

  interface Props {
    app: AppEntity;
    /** Absent: the user may not disable or enable the app. */
    onDisable?: () => void;
    onEnable?: () => void;
    enabling?: boolean;
  }

  let { app, onDisable, onEnable, enabling = false }: Props = $props();

  const iconKey = $derived(JSON.stringify(app.icon ?? null));
  const shortId = $derived(
    app.id.length > 12 ? `${app.id.slice(0, 6)}…${app.id.slice(-3)}` : app.id,
  );
</script>

<header class="flex flex-wrap items-start gap-4">
  <!-- The icon that an admin chose; a new one fades in over the old one. -->
  <span class="grid shrink-0 place-items-center">
    {#key iconKey}
      <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
        <IdentityAvatar profile={agentProfile(app)} kind="app" size={48} />
      </span>
    {/key}
  </span>
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="truncate">{app.name}</h1>
      <Badge variant="outline">{t(messages.appBadge)}</Badge>
      {#if app.disabledAt}
        <Badge variant="secondary">{t(agentsListMessages.disabled)}</Badge>
      {/if}
    </div>
    <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {t(agentPageMessages.id)}
      <span class="font-mono text-foreground" title={app.id}>{shortId}</span>
      <button
        type="button"
        class="rounded p-0.5 hover:bg-muted"
        aria-label={t(agentPageMessages.copyId)}
        onclick={() => copyToClipboard(app.id, { copied: t(agentsListMessages.idCopied) })}
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
      </button>
      <span class="hidden sm:inline" aria-hidden="true">·</span>
      {t(agentPageMessages.createdOn(formatDay(app.createdAt)))}
    </p>
  </div>
  {#if app.disabledAt && onEnable}
    <Button onclick={onEnable} disabled={enabling}>
      <PowerIcon class="size-4" aria-hidden="true" />
      {t(agentPageMessages.enable)}
    </Button>
  {:else if !app.disabledAt && onDisable}
    <Button variant="destructive" onclick={onDisable}>
      <PowerOffIcon class="size-4" aria-hidden="true" />
      {t(agentPageMessages.disable)}
    </Button>
  {/if}
</header>
