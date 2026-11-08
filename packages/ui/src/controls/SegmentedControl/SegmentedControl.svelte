<script lang="ts" generics="T extends string">
  import { ToggleGroup } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import Segment from './Segment.svelte';
  import type { SegmentedOption, SegmentedSize } from './segmented-control.ts';
  import { followSelection } from './thumb.attachments.svelte.ts';

  interface Props {
    value: T;
    options: readonly SegmentedOption<T>[];
    onChange: (value: T) => void;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    size?: SegmentedSize;
    /** Equal columns over the full width. */
    fill?: boolean;
    class?: string;
    itemClass?: string;
  }

  let {
    value,
    options,
    onChange,
    size = 'default',
    fill = false,
    class: className,
    itemClass,
    ...aria
  }: Props = $props();
</script>

<!-- One choice out of a few. The thumb under the selected segment moves to the new one. -->
<ToggleGroup
  type="single"
  spacing={0.5}
  bind:value={
    () => value,
    // A click on the selected segment empties the group: the choice stays.
    (next: string) => {
      if (next && next !== value) onChange(next as T);
    }
  }
  class={cn(
    'relative w-fit rounded-full bg-muted',
    size === 'sm' ? 'p-0.5' : 'p-[3px]',
    fill && 'grid w-full auto-cols-fr grid-flow-col',
    className,
  )}
  {...aria}
>
  <span
    aria-hidden="true"
    data-part="segmented-thumb"
    class="pointer-events-none absolute top-0 left-0 rounded-full bg-background shadow-xs ring-1 ring-foreground/6 ring-inset"
    {@attach followSelection(() => value)}
  ></span>
  {#each options as option (option.value)}
    <Segment {option} {size} class={itemClass} />
  {/each}
</ToggleGroup>
