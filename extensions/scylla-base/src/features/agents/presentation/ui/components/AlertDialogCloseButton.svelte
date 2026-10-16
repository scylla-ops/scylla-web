<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { t } from '@scylla/ui/i18n';
  import { agentsMessages } from '../agents.messages.ts';

  interface Props {
    onclick: () => void;
    disabled?: boolean;
  }

  let { onclick, disabled = false }: Props = $props();
</script>

<!-- An alert dialog has no close button of its own: the same X as `ScyllaDialog`. -->
<button
  type="button"
  {onclick}
  {disabled}
  class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
>
  <XIcon class="size-4" />
  <span class="sr-only">{t(agentsMessages.close)}</span>
</button>
