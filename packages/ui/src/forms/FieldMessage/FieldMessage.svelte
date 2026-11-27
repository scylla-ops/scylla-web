<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/index.ts';
  import { fold, unfold } from '../../motion/fold.ts';

  interface Props {
    /** The error text. Empty, `null` or `false`: nothing shows and nothing takes room. */
    message?: string | null | false;
    /** The id that `aria-describedby` of the field points to. */
    id?: string;
    /** `alert` for an error that comes without a change of the focus. */
    role?: 'alert';
    /** `sm` for an error under a whole form, `xs` under a field. */
    size?: 'xs' | 'sm';
    class?: string;
    /** The content, when it is more than the text of `message`. */
    children?: Snippet;
  }

  let { message, id, role, size = 'xs', class: className, children }: Props = $props();
</script>

{#if message}
  <p
    {id}
    data-slot="field-message"
    {role}
    class={cn(size === 'xs' ? 'text-xs' : 'text-sm', 'text-destructive', className)}
    in:unfold
    out:fold
  >
    {#if children}{@render children()}{:else}{message}{/if}
  </p>
{/if}
