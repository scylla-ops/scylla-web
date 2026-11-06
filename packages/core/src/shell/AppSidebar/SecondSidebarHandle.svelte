<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { shellMessages } from '../shell.messages.ts';
  import { resizeSecondSidebar } from './second-sidebar-handle.attachments.ts';
  import type { SecondSidebarWidth } from './second-sidebar-width.state.svelte.ts';

  interface Props {
    width: SecondSidebarWidth;
    controls: string;
    class?: string;
  }

  let { width, controls, class: className }: Props = $props();
</script>

<!-- A wide hit area on the border of the sidebar. The line takes the colours of `ResizableHandle`. -->
<!-- A separator that takes the focus is a widget in ARIA. The rule does not know this case. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  role="separator"
  tabindex="0"
  data-slot="second-sidebar-handle"
  aria-orientation="vertical"
  aria-label={t(shellMessages.resizeSidebar)}
  aria-controls={controls}
  aria-valuemin={width.min}
  aria-valuemax={width.max}
  aria-valuenow={width.current}
  class={cn(
    'w-3 cursor-ew-resize touch-none outline-hidden select-none',
    'after:absolute after:inset-y-0 after:right-1.5 after:w-px after:transition-colors',
    'hover:after:bg-primary/40 focus-visible:after:bg-primary data-[active]:after:bg-primary',
    className,
  )}
  {@attach resizeSecondSidebar(width)}
></div>
