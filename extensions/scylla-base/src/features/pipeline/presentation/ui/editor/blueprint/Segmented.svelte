<script lang="ts" generics="T extends string">
  import type { LucideIcon } from '@scylla/ui';
  import { ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    value: T;
    options: readonly { value: T; label: string; icon?: LucideIcon }[];
    /** The accessible name of the group. */
    label: string;
    onChange: (value: T) => void;
    class?: string;
    itemClass?: string;
  }

  let { value, options, label, onChange, class: className, itemClass }: Props = $props();
</script>

<!-- One choice out of a few, as segments on a muted track. -->
<ToggleGroup
  type="single"
  spacing={0.5}
  {value}
  onValueChange={next => {
    // A click on the pressed segment empties the group: the choice stays.
    if (next) onChange(next as T);
  }}
  aria-label={label}
  class={cn('rounded-md bg-muted p-0.5', className)}
>
  {#each options as option (option.value)}
    <ToggleGroupItem
      value={option.value}
      size="sm"
      class={cn(
        'h-auto gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-xs',
        itemClass,
      )}
    >
      {#if option.icon}<option.icon class="size-3.5" />{/if}
      {option.label}
    </ToggleGroupItem>
  {/each}
</ToggleGroup>
