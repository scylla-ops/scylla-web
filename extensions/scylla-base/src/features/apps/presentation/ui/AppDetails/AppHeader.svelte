<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PlugIcon from '@lucide/svelte/icons/plug';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    app: AppEntity;
    /** Absent: the user may not disable or enable the app. */
    onDisable?: () => void;
    onEnable?: () => void;
    enabling?: boolean;
  }

  let { app, onDisable, onEnable, enabling = false }: Props = $props();

  const shortId = $derived(
    app.id.length > 12 ? `${app.id.slice(0, 6)}…${app.id.slice(-3)}` : app.id,
  );
</script>

<header class="flex flex-wrap items-start gap-4">
  <span
    class="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted"
    aria-hidden="true"
  >
    <PlugIcon class="size-5" />
  </span>
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="truncate text-2xl font-medium">{app.name}</h1>
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
      · {t(agentPageMessages.createdOn(formatDay(app.createdAt)))}
    </p>
  </div>
  {#if app.disabledAt && onEnable}
    <Button onclick={onEnable} disabled={enabling}>
      <PowerIcon class="size-4" aria-hidden="true" />
      {t(agentPageMessages.enable)}
    </Button>
  {:else if !app.disabledAt && onDisable}
    <Button variant="outline" onclick={onDisable}>
      <PowerOffIcon class="size-4" aria-hidden="true" />
      {t(agentPageMessages.disable)}
    </Button>
  {/if}
</header>
