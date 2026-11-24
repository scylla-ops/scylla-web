<script lang="ts">
  import ArrowDownRightIcon from '@lucide/svelte/icons/arrow-down-right';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import { cn } from '../../utils/index.ts';
  import { CHART_DELTA_TONE, type ChartDeltaDirection, type ChartDeltaTone } from './chart-delta.ts';

  interface Props {
    /** The change as the user reads it: "+3.4 pts", "−12 %". */
    label: string;
    direction: ChartDeltaDirection;
    tone: ChartDeltaTone;
    class?: string;
  }

  let { label, direction, tone, class: className }: Props = $props();

  const ICONS = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: MinusIcon };
  const Icon = $derived(ICONS[direction]);
</script>

<span
  data-slot="chart-delta"
  data-direction={direction}
  data-tone={tone}
  class={cn(
    'inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-full px-1.5 text-xs font-medium whitespace-nowrap tabular-nums',
    CHART_DELTA_TONE[tone],
    className,
  )}
>
  <Icon aria-hidden="true" class="size-3" />
  {label}
</span>
