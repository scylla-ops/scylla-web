<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
  import { GatedButton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { gitEventsMessages as messages } from '@base/features/pipeline/presentation/messages/git-events.messages.ts';
  import type { GitEvents } from './git-events.state.svelte.ts';

  interface Props {
    gitEvents: GitEvents;
  }

  let { gitEvents }: Props = $props();
</script>

<!-- The Git events of a Scylla pipeline in a project of files: off until an admin allows them. -->
<div
  role="note"
  class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2 text-sm"
>
  {#if gitEvents.allowed}
    <CircleCheckIcon class="size-4 shrink-0 text-success" aria-hidden="true" />
    <span class="min-w-0 flex-1 text-muted-foreground">{t(messages.on)}</span>
    {#if gitEvents.canManage}
      <Button
        variant="ghost-destructive"
        size="xs"
        disabled={gitEvents.isPending}
        onclick={() => gitEvents.ask('revoke')}
      >
        {t(messages.revokeGitEvents)}
      </Button>
    {/if}
  {:else}
    <ShieldAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
    <span class="min-w-0 flex-1 basis-60 text-muted-foreground">{t(messages.off)}</span>
    <GatedButton
      variant="outline"
      size="sm"
      allowed={gitEvents.canManage}
      deniedReason={t(messages.allowDenied)}
      disabled={gitEvents.isPending}
      onclick={() => gitEvents.ask('allow')}
    >
      {t(messages.allow)}
    </GatedButton>
  {/if}
</div>
