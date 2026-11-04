<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { ciExample, httpExample } from '@base/features/apps/domain/structs/app-snippets.struct.ts';
  import type { ReadyApp } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  interface Props {
    ready: ReadyApp;
    workspaceId: string;
    server: string;
  }

  let { ready, workspaceId, server }: Props = $props();
</script>

<div class="flex flex-col gap-4">
  {#if !ready.rolesGranted}
    <p class="rounded-lg border border-warning/60 bg-warning/10 px-3 py-2 text-sm" role="alert">
      {t(messages.rolesFailed)}
    </p>
  {/if}

  {#if ready.token}
    <p class="flex items-center gap-2 text-sm">
      <CircleCheckIcon class="size-4 text-primary" aria-hidden="true" />
      {t(messages.tokenReady(ready.token.token.name))}
    </p>
    <div class="flex flex-col gap-2">
      <span class="flex items-center gap-2 text-sm font-medium">
        {t(messages.apiToken)}
        <span class="rounded-full border px-2 py-0.5 text-xs font-normal">
          {t(messages.shownOnce)}
        </span>
      </span>
      <CopyBox value={ready.token.secret} copyToast={t(messages.copied)} focusOnMount />
      <p class="text-xs text-muted-foreground">
        {t(messages.copyNow(formatDay(ready.token.token.expiresAt)))}
      </p>
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-sm">{t(messages.callApi)}</span>
      <CopyBox
        value={httpExample(server, workspaceId)}
        layout="lines"
        copyToast={t(messages.copied)}
      />
    </div>
  {:else if ready.identity}
    <p class="flex items-center gap-2 text-sm">
      <CircleCheckIcon class="size-4 text-primary" aria-hidden="true" />
      {t(messages.identityReady(ready.identity.repository))}
    </p>
    <div class="flex flex-col gap-2">
      <span class="text-sm">{t(messages.inWorkflow)}</span>
      <CopyBox
        value={ciExample(ready.identity.provider, server, ready.created.app.id)}
        layout="lines"
        copyToast={t(messages.copied)}
      />
    </div>
  {/if}
</div>
