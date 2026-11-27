<script lang="ts">
  import PowerIcon from '@lucide/svelte/icons/power';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { enter } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    /** The time that the app was disabled. */
    disabledAt: string;
    body?: string;
    /** Absent: the user may not enable the app. */
    onEnable?: () => void;
    enabling?: boolean;
  }

  let { disabledAt, body, onEnable, enabling = false }: Props = $props();
</script>

<!-- The icon, the text and the button are centered on one line; the button goes under on a phone. -->
<div
  in:enter
  class="flex flex-wrap items-center gap-3 rounded-xl border border-warning/60 bg-warning/10 px-4 py-3"
  role="status"
>
  <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
  <div class="flex min-w-0 grow basis-56 flex-col gap-0.5">
    <p class="text-sm font-medium">{t(messages.disabledSince(formatDay(disabledAt)))}</p>
    {#if body}
      <p class="text-xs text-muted-foreground">{body}</p>
    {/if}
  </div>
  {#if onEnable}
    <Button size="sm" onclick={onEnable} disabled={enabling}>
      <PowerIcon class="size-4" aria-hidden="true" />
      {t(messages.enable)}
    </Button>
  {/if}
</div>
