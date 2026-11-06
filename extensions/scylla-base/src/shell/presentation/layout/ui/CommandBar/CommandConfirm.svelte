<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';

  interface Props {
    question: string;
    detail?: string;
    verb: string;
    run: () => void | Promise<void>;
    onCancel: () => void;
    onDone: () => void;
  }

  let { question, detail, verb, run, onCancel, onDone }: Props = $props();

  let confirm = $state<HTMLElement | null>(null);
  let busy = $state(false);

  $effect(() => {
    confirm?.focus();
  });

  const execute = async () => {
    if (busy) return;
    busy = true;
    try {
      await run();
      onDone();
    } finally {
      busy = false;
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else if (event.key === 'Enter' && event.repeat) {
      // The key of the row that led here, still down.
      event.preventDefault();
      event.stopPropagation();
    }
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col gap-3 p-4" onkeydown={onKey}>
  <div class="flex flex-col gap-1">
    <p class="text-sm font-medium">{question}</p>
    {#if detail}
      <p class="text-sm text-muted-foreground">{detail}</p>
    {/if}
  </div>
  <div class="flex justify-end gap-2">
    <Button variant="ghost" size="sm" onclick={onCancel}>{t(messages.cancel)}</Button>
    <Button bind:ref={confirm} size="sm" disabled={busy} onclick={execute}>{verb}</Button>
  </div>
</div>
