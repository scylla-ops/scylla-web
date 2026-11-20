<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    type InstallWay,
    LOG_COMMANDS,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    way: InstallWay;
    /** A machine joined, and its agent did not connect yet. */
    joined: boolean;
    expired: boolean;
    /** The time of the page, in ms. */
    now: number;
  }

  let { way, joined, expired, now }: Props = $props();

  const shownAt = Date.now();
  const stopped = $derived(expired && !joined);
  const waitedOneMinute = $derived(now - shownAt >= 60_000);
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3 rounded-lg border px-4 py-3" role="status">
    <span class="relative flex size-2" aria-hidden="true">
      {#if !stopped}
        <span
          class="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75 motion-reduce:animate-none"
        ></span>
      {/if}
      <span
        class={cn(
          'relative inline-flex size-2 rounded-full',
          stopped ? 'bg-muted-foreground' : 'bg-warning',
        )}
      ></span>
    </span>
    <span class={cn('text-sm', stopped && 'text-muted-foreground')}>
      {joined ? t(messages.joined) : stopped ? t(messages.makeNewCode) : t(messages.waiting)}
    </span>
  </div>

  {#if waitedOneMinute && !stopped}
    <div class="flex flex-col gap-1.5">
      <p class="text-xs text-muted-foreground">{t(messages.noConnection)}</p>
      <CopyBox value={LOG_COMMANDS[way]} layout="lines" copyToast={t(messages.copied)} />
    </div>
  {/if}
</div>
