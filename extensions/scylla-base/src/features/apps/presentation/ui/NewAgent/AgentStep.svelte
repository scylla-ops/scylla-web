<script lang="ts">
  import type { Snippet } from 'svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    number: number;
    state: 'done' | 'current' | 'todo';
    title: string;
    /** A line under the title: what a done step chose, or what a current step asks. */
    summary?: string;
    /** The content shows. */
    open?: boolean;
    last?: boolean;
    children?: Snippet;
  }

  let { number, state, title, summary, open = false, last = false, children }: Props = $props();
</script>

<li class="flex gap-3" aria-current={state === 'current' ? 'step' : undefined}>
  <div class="flex flex-col items-center" aria-hidden="true">
    <span
      class={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors duration-300 motion-reduce:transition-none',
        state === 'todo'
          ? 'border-muted-foreground/50 text-muted-foreground'
          : 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {#if state === 'done'}
        <CheckIcon class="size-3.5" />
      {:else}
        {number}
      {/if}
    </span>
    {#if !last}
      <span
        class={cn(
          'my-1 w-px flex-1 transition-colors duration-500 motion-reduce:transition-none',
          state === 'done' ? 'bg-primary' : 'bg-border',
        )}
      ></span>
    {/if}
  </div>
  <div class={cn('flex min-w-0 flex-1 flex-col', !last && 'pb-6')}>
    <h2
      class={cn(
        'flex h-6 items-center text-sm font-medium',
        state === 'todo' && 'text-muted-foreground',
      )}
    >
      {title}
    </h2>
    {#if summary}
      <p class="text-sm text-muted-foreground">{summary}</p>
    {/if}
    {#if open && children}
      <div class="mt-4">{@render children()}</div>
    {/if}
  </div>
</li>
