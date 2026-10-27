<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    hint: string;
    children: Snippet;
  }

  let { id, title, hint, children }: Props = $props();
</script>

<section aria-labelledby={id} class="flex flex-col gap-5">
  <header class="flex flex-col gap-1">
    <h2 {id} class="text-base font-semibold">{title}</h2>
    <p class="text-sm text-muted-foreground">{hint}</p>
  </header>
  <div class="flex flex-col gap-4">
    {@render children()}
  </div>
</section>
