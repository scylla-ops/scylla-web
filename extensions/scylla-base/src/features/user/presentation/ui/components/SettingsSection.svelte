<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    title: string;
    description?: string;
    /** `danger`: the section of the actions that cannot be undone. */
    tone?: 'default' | 'danger';
    children: Snippet;
  }

  let { title, description, tone = 'default', children }: Props = $props();

  const headingId = $props.id();
</script>

<section aria-labelledby={headingId}>
  <Card class={cn('gap-4', tone === 'danger' && 'border-destructive/50')}>
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
    <CardContent>{@render children()}</CardContent>
  </Card>
</section>
