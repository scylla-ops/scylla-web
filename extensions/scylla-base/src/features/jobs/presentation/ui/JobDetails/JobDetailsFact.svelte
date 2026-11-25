<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    children: Snippet;
  }

  let { label, children }: Props = $props();
</script>

<!--
  One fact of the details: its label, then its value on the same line. A long value is cut,
  never wrapped. On a phone, the labels have one width, so the values align.
-->
<div class="flex min-h-5 max-w-full min-w-0 items-center gap-2">
  <dt
    class="w-24 shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:w-auto"
  >
    {label}
  </dt>
  <dd class="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
    {@render children()}
  </dd>
</div>
