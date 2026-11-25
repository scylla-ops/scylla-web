<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    /** `dl` for facts (`JobDetailsFact`), `ul` for a list of `li`. */
    as?: 'dl' | 'ul';
    children: Snippet;
  }

  let { title, as = 'dl', children }: Props = $props();

  const titleId = $props.id();
</script>

<!--
  A group of the details: its title, then its items on one line, on more lines only when the
  width is not sufficient. On a phone, the title, then one item on each line.
-->
<section aria-labelledby={titleId} class="flex min-w-0 flex-col gap-1 sm:flex-row sm:gap-3">
  <h3
    id={titleId}
    class="flex h-5 shrink-0 items-center text-xs text-foreground sm:w-16"
  >
    {title}
  </h3>
  <svelte:element
    this={as}
    class="flex min-w-0 flex-1 flex-col gap-y-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3.5"
  >
    {@render children()}
  </svelte:element>
</section>
