<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../utils/index.ts';
  import { CHART_TONE_FILL, type ChartTone } from './chart-tone.ts';

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    tone: ChartTone;
  };

  let { tone, class: className, ...rest }: Props = $props();
</script>

<span
  data-slot="chart-segment"
  data-tone={tone}
  class={cn('block min-h-px min-w-px rounded-[2px]', CHART_TONE_FILL[tone], className)}
  {...rest}
></span>
