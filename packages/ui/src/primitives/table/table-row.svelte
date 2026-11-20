<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLAttributes<HTMLTableRowElement> & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<tr
  data-slot="table-row"
  class={cn(
    // On the cells: a `tr` does not clip its background to the rounded corners.
    // An inset shadow for the bar: it does not shift the first column.
    'has-aria-expanded:[&>td]:bg-muted/40 data-[state=selected]:[&>td]:bg-primary/[0.07] data-[state=selected]:[&>td:first-child]:shadow-[inset_3px_0_0_0_var(--primary)]',
    rest.onclick &&
      'cursor-pointer hover:[&>td]:bg-muted/40 data-[state=selected]:hover:[&>td]:bg-primary/[0.1]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</tr>
