<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@scylla/ui/utils';
  import { enterPlace, type LinkTarget } from '../widget-navigation.ts';

  interface Props {
    /** `null`: no page to open. The content shows as plain text, not as a link. */
    link: LinkTarget | null;
    /** What a click opens. Not set: the title of the link, if it has one. */
    title?: string;
    class?: string;
    children: Snippet;
  }

  let { link, title, class: className, children }: Props = $props();
</script>

{#if link}
  <a
    href={link.href}
    title={title ?? link.title}
    data-slot="widget-link"
    class={cn('rounded-[2px] hover:underline focus-visible:underline', className)}
    onclick={link.place && enterPlace(link.place)}
  >
    {@render children()}
  </a>
{:else}
  <span class={className}>{@render children()}</span>
{/if}
