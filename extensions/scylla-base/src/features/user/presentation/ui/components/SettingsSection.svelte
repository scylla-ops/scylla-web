<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    title: string;
    description?: string;
    /** `danger`: the section of the actions that cannot be undone. */
    tone?: 'default' | 'danger';
    /** True: the content takes the height that the card gets from its grid cell. */
    fill?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    description,
    tone = 'default',
    fill = false,
    class: className,
    children,
  }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId} class={className}>
  <Card class={cn('h-full gap-4', tone === 'danger' && 'border-destructive/50')}>
    <CardHeader>
      <CardTitle>
        <h2 id={headingId} class={cn('text-base', tone === 'danger' && 'text-destructive')}>
          {title}
        </h2>
      </CardTitle>
      {#if description}
        <CardDescription>{description}</CardDescription>
      {/if}
    </CardHeader>
    <CardContent class={cn(fill && 'flex min-h-0 flex-1 flex-col')}>
      {@render children()}
    </CardContent>
  </Card>
</section>
