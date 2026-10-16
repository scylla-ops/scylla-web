<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import SearchIcon from '@lucide/svelte/icons/search';

  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    value?: string;
    /** The placeholder and the accessible name. */
    label: string;
  }

  let { value = $bindable(''), label, ...rest }: Props = $props();
</script>

<!-- The search box of the palette and of the quick-add menu. -->
<label
  class="flex h-8.5 items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20"
>
  <SearchIcon class="size-4 shrink-0" />
  <input
    class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
    placeholder={label}
    aria-label={label}
    bind:value
    {...rest}
  />
</label>
