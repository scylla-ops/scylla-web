<script lang="ts">
  import { PaneResizer, type PaneResizerProps } from 'paneforge';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { cn } from '../../utils/index.ts';
  import { resizableMessages } from './resizable.messages.ts';

  let { class: className, ...rest }: PaneResizerProps = $props();
</script>

<!--
  A thin line with a wider hit area. The line takes the primary colour under the pointer, on focus
  and while dragged.
-->
<PaneResizer
  data-slot="resizable-handle"
  class={cn(
    'relative flex w-px shrink-0 items-center justify-center bg-border outline-none transition-colors',
    'after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2',
    'hover:bg-primary/40 focus-visible:bg-primary data-[active]:bg-primary',
    'data-[direction=vertical]:h-px data-[direction=vertical]:w-full',
    'data-[direction=vertical]:after:inset-x-0 data-[direction=vertical]:after:inset-y-auto data-[direction=vertical]:after:left-0 data-[direction=vertical]:after:top-1/2 data-[direction=vertical]:after:h-3 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:translate-x-0 data-[direction=vertical]:after:-translate-y-1/2',
    className,
  )}
  {...rest}
  aria-label={rest['aria-label'] ?? t(resizableMessages.resize)}
/>
