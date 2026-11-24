<script lang="ts">
  import type { StatusState } from '../status-state.ts';
  import { cn } from '../../utils/index.ts';
  import { renderStatusShape } from './status-shape.attachments.svelte.ts';

  interface Props {
    state: StatusState;
    /** The accessible name: the status, in words. The drawing has no text. */
    label: string;
    /** The side of the square, in px. */
    size?: number;
    class?: string;
  }

  let { state, label, size = 40, class: className }: Props = $props();
</script>

<!--
  The four dots of the logo, in the form of the state: a grid (waiting), marbles that run
  round (running), a disc (success), a cross (failed), a slash (skipped). A change of state
  is a move, never a jump. `data-state` lets a test read the status without the pixels.
-->
<span
  role="img"
  aria-label={label}
  data-slot="status-shape"
  data-state={state}
  style:width="{size}px"
  style:height="{size}px"
  class={cn('inline-block shrink-0', className)}
>
  <canvas aria-hidden="true" class="block size-full" {@attach renderStatusShape(() => ({ state, size }))}></canvas>
</span>
