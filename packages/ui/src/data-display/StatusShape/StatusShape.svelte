<script lang="ts">
  import type { StatusState } from '../status-state.ts';
  import { cn } from '../../utils/index.ts';
  import { renderStatusShape } from './status-shape.attachments.svelte.ts';
  import { shapeFormOf } from './status-shape.forms.ts';

  interface Props {
    state: StatusState;
    /** The accessible name: the status, in words. The drawing has no text. */
    label: string;
    /** The side of the square, in px. */
    size?: number;
    class?: string;
  }

  let { state, label, size = 40, class: className }: Props = $props();

  // Nothing has run: a hollow dashed ring, not a pattern of dots (it read as a drag grip).
  const waiting = $derived(shapeFormOf(state) === 'queued');
</script>

<!--
  The four dots of the logo, in the form of the state: a dashed ring (waiting), marbles that run
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
  class={cn('relative inline-block shrink-0', className)}
>
  <!-- The ring is about as wide as the circle of the marbles, and as thick as one marble. -->
  <svg
    aria-hidden="true"
    viewBox="0 0 100 100"
    data-slot="status-shape-ring"
    class={cn(
      'absolute inset-0 size-full text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none',
      waiting ? 'opacity-100' : 'opacity-0',
    )}
  >
    <circle
      cx="50"
      cy="50"
      r="31"
      fill="none"
      stroke="currentColor"
      stroke-width="9"
      stroke-dasharray="11 8.48"
    />
  </svg>
  <canvas
    aria-hidden="true"
    class={cn(
      'block size-full transition-opacity duration-300 motion-reduce:transition-none',
      waiting ? 'opacity-0' : 'opacity-100',
    )}
    {@attach renderStatusShape(() => ({ state, size }))}></canvas>
</span>
