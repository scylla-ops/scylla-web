<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label } from '@scylla/ui/primitives';

  interface Props {
    /** The id of the control. */
    id: string;
    label: string;
    hint?: string;
    error?: string;
    /** Beside the label: the state of the value. */
    badge?: Snippet;
    /** The control, with the ids of the hint and of the error for `aria-describedby`. */
    children: Snippet<[string | undefined]>;
  }

  let { id, label, hint, error, badge, children }: Props = $props();

  const describedBy = $derived(
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
  );
</script>

<div class="flex min-w-0 flex-col gap-2">
  <div class="flex items-center gap-2">
    <Label for={id}>{label}</Label>
    {@render badge?.()}
  </div>
  {@render children(describedBy)}
  {#if error}
    <p id={`${id}-error`} class="text-xs text-destructive">{error}</p>
  {/if}
  {#if hint}
    <p id={`${id}-hint`} class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
