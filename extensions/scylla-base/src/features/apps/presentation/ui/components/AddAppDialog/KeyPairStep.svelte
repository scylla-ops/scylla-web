<script lang="ts">
  import ClockIcon from '@lucide/svelte/icons/clock';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import { formatCountdown, secondsLeft } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { JOIN_METHOD } from '@base/features/apps/domain/structs/app-snippets.struct.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { addAgentMessages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  interface Props {
    joinCode: JoinCode;
    onNewCode: () => void;
    renewing: boolean;
    /** A machine joined with a new key. */
    joined: boolean;
  }

  let { joinCode, onNewCode, renewing, joined }: Props = $props();

  let now = $state(new Date());
  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(timer);
  });
  const left = $derived(secondsLeft(joinCode.expiresAt, now));
</script>

<div class="flex flex-col gap-4">
  <p class="text-sm">{t(messages.keypairIntro)}</p>
  <CopyBox value={joinCode.code} copyToast={t(messages.copied)} />
  <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
    <ClockIcon class="size-3.5" aria-hidden="true" />
    <span>
      {left > 0
        ? t(addAgentMessages.expiresIn(formatCountdown(left)))
        : t(addAgentMessages.expired)}
    </span>
    <Button
      type="button"
      variant="link"
      size="sm"
      class="h-auto p-0 text-xs"
      disabled={renewing}
      onclick={onNewCode}
    >
      {t(addAgentMessages.newCode)}
    </Button>
  </p>
  <p class="text-xs text-muted-foreground">{t(messages.joinWith(JOIN_METHOD))}</p>
  <div class="flex items-center gap-3 rounded-lg border px-4 py-3" role="status">
    <span
      class="size-2 rounded-full {joined ? 'bg-primary' : 'animate-pulse bg-warning'}"
      aria-hidden="true"
    ></span>
    <span class="flex-1 text-sm">
      {joined ? t(messages.serverJoined) : t(messages.waitingServer)}
    </span>
    {#if !joined}
      <span class="text-xs text-muted-foreground">{t(messages.checksEvery)}</span>
    {/if}
  </div>
</div>
