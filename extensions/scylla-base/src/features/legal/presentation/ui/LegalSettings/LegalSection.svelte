<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';

  interface Props {
    title: string;
    description?: string;
    /** Beside the title and the description, or under them in a narrow card. */
    action?: Snippet;
    children?: Snippet;
  }

  let { title, description, action, children }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId}>
  <Card class="gap-4">
    <CardHeader class="flex flex-wrap items-center gap-4">
      <div class="flex min-w-0 grow basis-64 flex-col gap-2">
        <CardTitle><h2 id={headingId} class="text-base">{title}</h2></CardTitle>
        {#if description}
          <CardDescription>{description}</CardDescription>
        {/if}
      </div>
      {#if action}
        <CardAction class="flex items-center">{@render action()}</CardAction>
      {/if}
    </CardHeader>
    {#if children}
      <CardContent>{@render children()}</CardContent>
    {/if}
  </Card>
</section>
