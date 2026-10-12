<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** On the left, e.g. "You will not see this secret again." */
    note?: string;
    /** A `data-tour` anchor on the actions, for the onboarding tour. */
    anchor?: string;
    /** The actions, on the right. */
    children: Snippet;
  }

  let { note, anchor, children }: Props = $props();
</script>

<!-- The full-width band at the bottom of every agent dialog. -->
<div
  data-dialog-part="footer"
  class="flex flex-col-reverse gap-3 border-t bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
>
  <p class="text-xs text-muted-foreground">{note ?? ''}</p>
  <div data-tour={anchor} class="flex items-center justify-end gap-2">
    {@render children()}
  </div>
</div>
