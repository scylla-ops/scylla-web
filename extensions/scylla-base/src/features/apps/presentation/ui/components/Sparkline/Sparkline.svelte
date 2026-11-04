<script lang="ts">
  import { cn } from '@scylla/ui/utils';

  interface Props {
    values: readonly number[];
    label: string;
    class?: string;
  }

  let { values, label, class: className }: Props = $props();

  const WIDTH = 96;
  const HEIGHT = 24;

  const points = $derived.by(() => {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    const step = WIDTH / (values.length - 1);
    const y = (value: number) => HEIGHT - 2 - (value / max) * (HEIGHT - 4);
    return values.map((value, index) => `${(index * step).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  });
</script>

<svg
  class={cn('h-6 w-24 shrink-0 text-primary', className)}
  viewBox="0 0 {WIDTH} {HEIGHT}"
  role="img"
  aria-label={label}
  preserveAspectRatio="none"
>
  <polyline
    {points}
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linejoin="round"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
  />
</svg>
