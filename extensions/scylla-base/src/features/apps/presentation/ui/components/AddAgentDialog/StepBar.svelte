<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    labels: readonly string[];
    /** The index of the current step. The steps before it are done. */
    current: number;
  }

  let { labels, current }: Props = $props();
</script>

<ol class="flex items-center gap-2" data-slot="step-bar">
  {#each labels as label, index (label)}
    {@const done = index < current}
    {@const active = index === current}
    <li
      class="flex items-center gap-2 not-last:flex-1"
      aria-current={active ? 'step' : undefined}
    >
      <span
        class={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors duration-300 motion-reduce:transition-none',
          done || active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/50 text-muted-foreground',
        )}
      >
        {#if done}
          <CheckIcon class="size-3.5" aria-hidden="true" />
        {:else}
          {index + 1}
        {/if}
      </span>
      <span class={cn('text-xs', done || active ? 'font-medium' : 'text-muted-foreground')}>
        {label}
      </span>
      {#if index < labels.length - 1}
        <span class="h-px flex-1 overflow-hidden bg-border" aria-hidden="true">
          <span
            class={cn(
              'block h-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none',
              done ? 'w-full' : 'w-0',
            )}
          ></span>
        </span>
      {/if}
    </li>
  {/each}
</ol>
