<script lang="ts">
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { CredentialRow } from '@base/features/apps/domain/structs/app-credentials.struct.ts';
  import { credentialLabels } from '@base/features/apps/presentation/presenters/credential-labels.presenter.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  let { latest }: { latest: CredentialRow | null } = $props();

  const labels = $derived(latest ? credentialLabels(latest, new Date()) : null);
</script>

<Card class="h-full">
  <CardHeader>
    <CardTitle><h2>{t(messages.activity)}</h2></CardTitle>
  </CardHeader>
  <CardContent class="flex flex-col gap-2 text-sm">
    {#if latest && labels}
      <p class="flex items-center gap-2">
        <ActivityIcon class="size-4" aria-hidden="true" />
        {t(messages.lastUsed(getRelativeTime(latest.lastUsedAt)))}
      </p>
      <p class="text-xs text-muted-foreground">
        {t(messages.lastUsedWith(`${labels.kind} ${labels.name}`))}
      </p>
    {:else}
      <p class="text-xs text-muted-foreground">{t(messages.neverUsed)}</p>
    {/if}
  </CardContent>
</Card>
