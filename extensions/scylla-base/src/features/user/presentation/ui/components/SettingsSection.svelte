<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    title: string;
    description?: string;
    /** `danger`: the section of the actions that cannot be undone. */
    tone?: 'default' | 'danger';
    /** True: the content takes the height that the section gets from its grid cell. */
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

<section aria-labelledby={headingId} class={cn('flex flex-col gap-4', className)}>
  <header class="flex flex-col gap-1.5">
    <h2
      id={headingId}
      class={cn('text-base leading-none font-semibold', tone === 'danger' && 'text-destructive')}
    >
      {title}
    </h2>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </header>
  <div class={cn(fill && 'flex min-h-0 flex-1 flex-col')}>
    {@render children()}
  </div>
</section>
