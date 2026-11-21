<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '@scylla/ui/utils';

  type Props = HTMLTextareaAttributes & { value?: string };

  let { class: className, value = $bindable(''), ...rest }: Props = $props();
</script>

<!-- The look of `Input`, on several lines. `@scylla/ui` has no text area yet: one use. -->
<textarea
  bind:value
  class={cn(
    'w-full min-w-0 rounded-lg border border-border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
    className,
  )}
  {...rest}
></textarea>
