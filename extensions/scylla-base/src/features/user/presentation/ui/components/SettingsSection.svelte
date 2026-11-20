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
  import { cn } from '@scylla/ui/utils';

  interface Props {
    title: string;
    description?: string;
    /** True: the `form-actions` slot of a form in the card is a bar at the bottom of the card. */
    actionBar?: boolean;
    class?: string;
    /** A button, beside the title and the description, or under them in a narrow card. */
    action?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    description,
    actionBar = false,
    class: className,
    action,
    children,
  }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId} class={className}>
  <Card
    class={cn(
      'h-full gap-4',
      actionBar &&
        'overflow-hidden pb-0 [&_[data-slot=form-actions]]:-mx-6 [&_[data-slot=form-actions]]:mt-6 [&_[data-slot=form-actions]]:border-t [&_[data-slot=form-actions]]:bg-muted/50 [&_[data-slot=form-actions]]:px-6 [&_[data-slot=form-actions]]:py-4',
    )}
  >
    <CardHeader class="flex flex-wrap items-center gap-4">
      <div class="flex min-w-0 grow basis-64 flex-col gap-2">
        <CardTitle>
          <h2 id={headingId} class="text-base">{title}</h2>
        </CardTitle>
        {#if description}
          <CardDescription>{description}</CardDescription>
        {/if}
      </div>
      {#if action}
        <CardAction>{@render action()}</CardAction>
      {/if}
    </CardHeader>
    {#if children}
      <CardContent>
        {@render children()}
      </CardContent>
    {/if}
  </Card>
</section>
