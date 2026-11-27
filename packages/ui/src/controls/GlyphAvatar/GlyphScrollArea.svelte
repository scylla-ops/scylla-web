<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/index.ts';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className }: Props = $props();

  let scroller = $state<HTMLDivElement>();
  let content = $state<HTMLDivElement>();
  /** More content below the visible part: the bottom edge fades and a chevron shows. */
  let more = $state(false);

  function measure() {
    if (!scroller) return;
    more = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 4;
  }

  $effect(() => {
    if (!scroller || !content) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(content);
    return () => observer.disconnect();
  });
</script>

<div data-slot="glyph-scroll-area" data-more={more || undefined} class={cn('relative min-h-0', className)}>
  <div
    bind:this={scroller}
    onscroll={measure}
    class={cn(
      'relative h-full max-h-[inherit] overflow-y-auto overscroll-contain p-1 transition-[mask-image] duration-200 motion-reduce:transition-none',
      more && '[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]',
    )}
  >
    <div bind:this={content}>{@render children()}</div>
  </div>
  <span
    aria-hidden="true"
    class={cn(
      'pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-muted-foreground transition-opacity duration-200 motion-reduce:transition-none',
      more ? 'opacity-100' : 'opacity-0',
    )}
  >
    <ChevronDownIcon class="size-4 animate-bounce motion-reduce:animate-none" />
  </span>
</div>
