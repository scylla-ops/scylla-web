<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import { t } from '@scylla/ui/i18n';
  import type { TestMailResult } from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';

  interface Props {
    result: TestMailResult;
  }

  let { result }: Props = $props();
</script>

<div role="status" class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
  <div class="flex items-center gap-2">
    {#if result.accepted}
      <CircleCheckIcon class="size-4 shrink-0 text-success" aria-hidden="true" />
      <p class="text-sm font-medium">{t(messages.testAccepted)}</p>
    {:else}
      <CircleXIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <p class="text-sm font-medium">{t(messages.testRefused)}</p>
    {/if}
  </div>
  <dl class="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
    {#if result.host}
      <dt class="text-muted-foreground">{t(messages.testHost)}</dt>
      <dd class="font-mono break-all">{result.host}</dd>
    {/if}
    {#if result.accepted}
      {#if result.reply}
        <dt class="text-muted-foreground">{t(messages.testReply)}</dt>
        <dd class="font-mono break-all">{result.reply}</dd>
      {/if}
      {#if result.messageId}
        <dt class="text-muted-foreground">{t(messages.testMessageId)}</dt>
        <dd class="font-mono break-all">{result.messageId}</dd>
      {/if}
    {:else}
      <dt class="text-muted-foreground">{t(messages.testReply)}</dt>
      <dd class="font-mono break-all">{result.error}</dd>
    {/if}
  </dl>
</div>
