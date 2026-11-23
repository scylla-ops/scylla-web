<script lang="ts">
  import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
  import { attentionMessages as messages } from '@base/features/dashboard/presentation/messages/attention.messages.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import AttentionRow from './AttentionRow.svelte';

  interface Props {
    open: boolean;
    items: readonly AttentionItem[];
    openCount: number;
    timeZone: string;
    onClose: () => void;
  }

  let { open, items, openCount, timeZone, onClose }: Props = $props();
</script>

<Dialog {open} onOpenChange={next => !next && onClose()}>
  <SheetContent side="right" overlayClass="bg-overlay/25" class="w-full gap-0 p-0 sm:max-w-[560px]">
    <header class="flex flex-col gap-1 border-b border-border px-5 py-4 pr-12">
      <DialogTitle>{t(widgetMessages.needsYou)}</DialogTitle>
      <DialogDescription class="text-xs">{openCount} {t(messages.openNow(openCount))}</DialogDescription>
    </header>
    <ul class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
      {#each items as item, index (`${item.kind}-${item.job?.id ?? item.fire?.id ?? item.agent?.id ?? index}`)}
        <AttentionRow {item} {timeZone} actions />
      {/each}
    </ul>
  </SheetContent>
</Dialog>
