<script lang="ts">
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { fade } from 'svelte/transition';
  import { motionDuration } from '../../motion/reduced-motion.ts';
  import { SWAP_IN } from '../../motion/swap.ts';
  import { cn } from '../../utils/index.ts';

  interface Props {
    /** The text that shows now. */
    text: string;
    /**
     * The other texts that this place shows in another state ("Saving...", "Reopen"). The place
     * takes the width of the longest, thus the button and its neighbours do not move when the
     * text changes.
     */
    reserve?: readonly string[];
    /** A spinner takes the place of the text, which stays for a screen reader. */
    busy?: boolean;
    class?: string;
  }

  let { text, reserve = [], busy = false, class: className }: Props = $props();

  const others = $derived([...new Set(reserve)].filter(other => other !== text));
</script>

<!-- All the texts in one grid cell: the cell has the size of the longest, the others are invisible. -->
<span data-slot="stable-label" class={cn('inline-grid place-items-center', className)}>
  {#each others as other (other)}
    <span class="invisible col-start-1 row-start-1" aria-hidden="true">{other}</span>
  {/each}
  {#key text}
    <!-- `opacity-0`, not `invisible`: the text stays the name of the button while it is busy. -->
    <!-- A fade only, with no scale: the label does not move in the button. -->
    <span
      class={cn('col-start-1 row-start-1', busy && 'opacity-0')}
      in:fade={{ duration: motionDuration(SWAP_IN.duration) }}
    >
      {text}
    </span>
  {/key}
  {#if busy}
    <LoaderCircleIcon class="col-start-1 row-start-1 size-4 animate-spin" aria-hidden="true" />
  {/if}
</span>
