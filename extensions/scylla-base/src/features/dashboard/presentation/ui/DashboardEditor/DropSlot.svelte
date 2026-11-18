<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { cellsText } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

  interface Props {
    size: LayoutSize;
  }

  let { size }: Props = $props();
</script>

<div
  data-slot="drop-here"
  class="pointer-events-none flex size-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/10 px-3 text-center"
>
  <span class="text-sm text-primary">{t(messages.dropHere)}</span>
  <span class="text-xs text-muted-foreground">{t(messages.dropHint(cellsText(size)))}</span>
</div>
