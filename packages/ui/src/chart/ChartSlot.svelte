<script lang="ts">
  import { cn } from '../utils/index.ts';

  interface Props {
    /** `offline`: a slot of an agent that is not connected. */
    state: 'busy' | 'free' | 'offline';
    class?: string;
  }

  let { state, class: className }: Props = $props();

  const STATES = {
    busy: 'bg-primary',
    free: 'bg-muted',
    offline: 'border border-border bg-transparent',
  };
</script>

<span
  data-slot="chart-slot"
  data-state={state}
  class={cn('block size-3.5 shrink-0 rounded-[3px]', STATES[state], className)}
></span>
