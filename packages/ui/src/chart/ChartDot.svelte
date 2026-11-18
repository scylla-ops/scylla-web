<script lang="ts">
  import { cn } from '../utils/index.ts';
  import { CHART_TONE_FILL, type ChartTone } from './chart-tone.ts';

  interface Props {
    tone: ChartTone;
    class?: string;
  }

  let { tone, class: className }: Props = $props();
</script>

<span
  aria-hidden="true"
  data-slot="chart-dot"
  data-tone={tone}
  class={cn('inline-block size-2 shrink-0 rounded-full', CHART_TONE_FILL[tone], className)}
></span>
