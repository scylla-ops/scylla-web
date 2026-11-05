<script lang="ts">
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { errorStateMessages } from './error-state.messages.ts';

  interface Props {
    title?: string;
    message?: string;
  }

  let { title, message }: Props = $props();
</script>

<div class="flex h-full items-center justify-center">
  <div class="space-y-2 text-center">
    <h2 class="text-lg text-destructive">{title ?? t(errorStateMessages.title)}</h2>
    <p class="text-sm text-muted-foreground">{message ?? t(errorStateMessages.message)}</p>
  </div>
</div>
