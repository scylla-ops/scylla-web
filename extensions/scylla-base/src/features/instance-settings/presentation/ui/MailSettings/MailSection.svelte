<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';

  interface Props {
    title: string;
    description: string;
    children: Snippet;
  }

  let { title, description, children }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId}>
  <Card class="gap-4">
    <CardHeader class="flex flex-col gap-2">
      <CardTitle><h2 id={headingId} class="text-base">{title}</h2></CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{@render children()}</CardContent>
  </Card>
</section>
