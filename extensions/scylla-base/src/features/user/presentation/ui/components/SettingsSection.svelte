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
    /** `danger`: the section of the actions that cannot be undone. */
    tone?: 'default' | 'danger';
    /** True: the content takes the height that the card gets from its grid cell. */
    fill?: boolean;
    /** True: the `form-actions` slot of a form in the card is a bar at the bottom of the card. */
    actionBar?: boolean;
    class?: string;
    /** Shown at the end of the header, e.g. a button. */
    action?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    description,
    tone = 'default',
    fill = false,
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
      tone === 'danger' && 'border-destructive/50',
      actionBar &&
        'overflow-hidden pb-0 [&_[data-slot=form-actions]]:-mx-6 [&_[data-slot=form-actions]]:mt-6 [&_[data-slot=form-actions]]:border-t [&_[data-slot=form-actions]]:bg-muted/50 [&_[data-slot=form-actions]]:px-6 [&_[data-slot=form-actions]]:py-4',
    )}
  >
    <CardHeader>
      <CardTitle>
        <h2 id={headingId} class={cn('text-base', tone === 'danger' && 'text-destructive')}>
          {title}
        </h2>
      </CardTitle>
      {#if description}
        <CardDescription>{description}</CardDescription>
      {/if}
      {#if action}
        <CardAction>{@render action()}</CardAction>
      {/if}
    </CardHeader>
    {#if children}
      <CardContent class={cn(fill && 'flex min-h-0 flex-1 flex-col')}>
        {@render children()}
      </CardContent>
    {/if}
  </Card>
</section>
