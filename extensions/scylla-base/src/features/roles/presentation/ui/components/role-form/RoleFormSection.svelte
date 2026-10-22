<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader } from '@scylla/ui/primitives';

  interface Props {
    id: string;
    title: string;
    hint: string;
    children: Snippet;
  }

  let { id, title, hint, children }: Props = $props();
</script>

<Card role="region" aria-labelledby={id} class="gap-5 py-5">
  <CardHeader class="gap-1 px-5">
    <h2 {id} class="text-base font-semibold">{title}</h2>
    <CardDescription>{hint}</CardDescription>
  </CardHeader>
  <CardContent class="flex flex-col gap-4 px-5">
    {@render children()}
  </CardContent>
</Card>
