<script lang="ts">
  import { onMount } from 'svelte';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { ProviderMark } from '@shared/presentation/ui';
  import { connectGitHubMessages as messages } from '@base/features/integrations/presentation/messages/connect-github.messages.ts';
  import { createGitHubCallback } from './github-callback.state.svelte.ts';

  const callback = createGitHubCallback();
  onMount(callback.start);
</script>

<div
  class="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center"
>
  {#if callback.failed}
    <span
      class="flex size-12 items-center justify-center rounded-full bg-muted text-destructive"
      aria-hidden="true"
    >
      <TriangleAlertIcon class="size-5" />
    </span>
    <h1>{t(messages.failedTitle)}</h1>
    <p role="alert" class="text-sm text-muted-foreground">{callback.error}</p>
    <Button href={callback.backHref}>{t(messages.backToIntegrations)}</Button>
  {:else if callback.saved}
    <span
      class="flex size-12 items-center justify-center rounded-full bg-muted text-success"
      aria-hidden="true"
    >
      <CircleCheckIcon class="size-5" />
    </span>
    <h1>{t(messages.savedTitle)}</h1>
    <p role="status" class="text-sm text-muted-foreground">{t(messages.savedBody)}</p>
    <Button href={callback.backHref}>{t(messages.openIntegrations)}</Button>
  {:else}
    <span
      class="flex size-12 items-center justify-center rounded-full bg-muted"
      aria-hidden="true"
    >
      <ProviderMark kind="github" class="size-5 animate-pulse" />
    </span>
    <p role="status" class="text-sm text-muted-foreground">{t(messages.connecting)}</p>
  {/if}
</div>
