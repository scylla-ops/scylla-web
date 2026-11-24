<script lang="ts">
  import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { pipelinesMessages as messages } from '@base/features/dashboard/presentation/messages/pipelines.messages.ts';
  import type { PipelineRow } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import PipelineTable from './PipelineTable.svelte';

  interface Props {
    open: boolean;
    rows: readonly PipelineRow[];
    green: number;
    onClose: () => void;
  }

  let { open, rows, green, onClose }: Props = $props();
</script>

<Dialog {open} onOpenChange={next => !next && onClose()}>
  <SheetContent side="right" overlayClass="bg-overlay/25" class="w-full gap-0 p-0 sm:max-w-[620px]">
    <header class="flex flex-col gap-1 border-b border-border px-5 py-4 pr-12">
      <DialogTitle>{t(widgetMessages.pipelines)}</DialogTitle>
      <DialogDescription class="text-xs">{t(messages.greenOf(green, rows.length))}</DialogDescription>
    </header>
    <div class="relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <PipelineTable {rows} />
    </div>
  </SheetContent>
</Dialog>
