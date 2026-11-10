<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '../../primitives/index.ts';

  interface Props {
    title: string;
    description?: string;
    class?: string;
    /** The destructive button, at the end of the header. */
    action: Snippet;
    /** Shown under the header. */
    children?: Snippet;
  }

  let { title, description, class: className, action, children }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId} class={className}>
  <Card class="h-full gap-4 border-destructive/50">
    <CardHeader>
      <CardTitle>
        <h2 id={headingId} class="text-base text-destructive">{title}</h2>
      </CardTitle>
      {#if description}
        <CardDescription>{description}</CardDescription>
      {/if}
      <CardAction>{@render action()}</CardAction>
    </CardHeader>
    {#if children}
      <CardContent>
        {@render children()}
      </CardContent>
    {/if}
  </Card>
</section>
