<script lang="ts">
  import { ToggleGroupItem } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { createCountRoll } from './count-roll.transition.ts';
  import type { SegmentedOption, SegmentedSize } from './segmented-control.ts';

  interface Props {
    option: SegmentedOption;
    size: SegmentedSize;
    class?: string;
  }

  let { option, size, class: className }: Props = $props();

  const counted = $derived(option.count !== undefined);
  const { rollIn, rollOut, pulse } = createCountRoll(() => option.count ?? 0);
</script>

<ToggleGroupItem
  value={option.value}
  class={cn(
    'group/segment relative h-auto gap-1.5 rounded-full py-1 font-medium text-muted-foreground',
    'transition-[color,background-color,opacity] duration-200 motion-reduce:duration-150',
    'hover:bg-transparent hover:text-foreground data-[state=off]:hover:bg-foreground/5',
    'data-[state=on]:bg-transparent data-[state=on]:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring',
    size === 'sm'
      ? 'px-2.5 text-xs'
      : ['text-sm', option.dot || counted ? 'pl-2.5' : 'pl-3', counted ? 'pr-1.5' : 'pr-3'],
    option.count === 0 && 'data-[state=off]:opacity-45',
    className,
  )}
>
  {#if option.dot}
    <span
      aria-hidden="true"
      class={cn(
        'relative size-1.5 shrink-0 rounded-full',
        option.dot.color,
        option.dot.hollow ? 'border-[1.5px] border-current' : 'bg-current',
      )}
    >
      {#if option.dot.pulse}
        {#key option.count}
          <span
            class="pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full border-[1.5px] border-current opacity-0"
            in:pulse
          ></span>
        {/key}
      {/if}
    </span>
  {/if}
  {#if option.icon}<option.icon class="size-3.5" />{/if}
  <span>{option.label}</span>
  {#if counted}
    <span
      aria-hidden="true"
      data-part="segmented-count"
      class="inline-grid h-[18px] min-w-[18px] place-items-center overflow-hidden rounded-full px-[5px] font-mono text-xs tabular-nums transition-colors duration-200 group-data-[state=on]/segment:bg-foreground/8 motion-reduce:duration-150"
    >
      {#key option.count}
        <span class="col-start-1 row-start-1" in:rollIn out:rollOut>{option.count}</span>
      {/key}
    </span>
    <span class="sr-only">{option.count}</span>
  {/if}
</ToggleGroupItem>
