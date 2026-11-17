<script lang="ts">
  import { cn } from '../utils/index.ts';

  interface Props {
    /** 0 is empty. 1 to 4 go up to the full primary color. */
    level: 0 | 1 | 2 | 3 | 4;
    class?: string;
  }

  let { level, class: className }: Props = $props();

  const LEVELS = ['bg-muted', 'bg-primary/30', 'bg-primary/55', 'bg-primary/80', 'bg-primary'];
</script>

<span
  data-slot="chart-heat-cell"
  data-level={level}
  class={cn('block size-3 shrink-0 rounded-[3px]', LEVELS[level], className)}
></span>
