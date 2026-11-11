<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    formatCountdown,
    type InstallWay,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { INSTALL_WAYS } from '../install-ways.registry.ts';
  import InstallInfo from './InstallInfo.svelte';

  interface Props {
    command: string;
    way: InstallWay;
    /** Docker with the socket of the machine: two commands, one per line. */
    socket: boolean;
    /** The seconds before the code expires. */
    left: number;
    renewing: boolean;
    onNewCode: () => void;
  }

  let { command, way, socket, left, renewing, onNewCode }: Props = $props();

  const expired = $derived(left <= 0);
</script>

{#snippet expiredOverlay()}
  <div
    class="flex items-center gap-2 rounded-full border bg-background py-1 pr-1 pl-3 text-xs font-medium shadow-sm"
  >
    {t(messages.thisCodeExpired)}
    <Button size="sm" class="h-7 rounded-full" disabled={renewing} onclick={onNewCode}>
      <RefreshCwIcon class="size-3.5" aria-hidden="true" />
      {t(messages.newCode)}
    </Button>
  </div>
{/snippet}

{#snippet footer()}
  <div
    class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground"
  >
    <span class="flex items-center gap-1.5">
      {t(socket ? messages.dockerContainersShort : INSTALL_WAYS[way].short)}
      <InstallInfo {way} {socket} />
    </span>
    {#if expired}
      <span class="flex items-center gap-1.5 text-destructive">
        <CircleAlertIcon class="size-3.5" aria-hidden="true" />
        {t(messages.codeExpired)}
      </span>
    {:else}
      <span class="flex items-center gap-3">
        <span class="flex items-center gap-1.5">
          <ClockIcon class="size-3.5" aria-hidden="true" />
          {t(messages.expiresShort(formatCountdown(left)))}
        </span>
        <Button
          type="button"
          variant="link"
          size="sm"
          class="h-auto p-0 text-xs"
          disabled={renewing}
          onclick={onNewCode}
        >
          {t(messages.newCode)}
        </Button>
      </span>
    {/if}
  </div>
{/snippet}

<CopyBox
  value={command}
  layout={socket ? 'lines' : 'wrap'}
  copyToast={t(messages.copied)}
  faded={expired}
  overlay={expired ? expiredOverlay : undefined}
  {footer}
  focusOnMount
/>
