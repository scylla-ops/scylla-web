<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '../../primitives/index.ts';
  import { dialogHoldStore, toRune } from '../../stores/index.ts';
  import { cn } from '../../utils/index.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    /** Replaces the title and the description, for a header with more than text. */
    header?: Snippet;
    /**
     * `false`: no close button, and Escape or a click outside does nothing. `'button'`: only the
     * close button closes it, for a dialog that a stray Escape or click must not lose.
     */
    dismissible?: boolean | 'button';
    class?: string;
    /** Built again at each opening, so a form in it starts empty. */
    children: Snippet;
    [dataAttribute: `data-${string}`]: unknown;
  }

  let {
    open,
    onOpenChange,
    title,
    description,
    header,
    dismissible = true,
    class: className,
    children,
    ...rest
  }: Props = $props();

  let openings = 0;
  const opening = $derived(open ? ++openings : openings);

  const hold = toRune(dialogHoldStore);
  const held = $derived(hold().held);

  const keepOpen = (event: Event) => {
    if (dialogHoldStore.getState().held || dismissible !== true) event.preventDefault();
  };
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent
    {...rest}
    class={cn(
      (held || dismissible === false) && '[&>button]:hidden',
      held && '[&_[data-dialog-dismiss]]:hidden',
      className,
    )}
    trapFocus={!held}
    onEscapeKeydown={keepOpen}
    onInteractOutside={keepOpen}
  >
    {#if header}
      {@render header()}
    {:else if title}
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {#if description}
          <DialogDescription>{description}</DialogDescription>
        {/if}
      </DialogHeader>
    {/if}
    {#key opening}
      {@render children()}
    {/key}
  </DialogContent>
</Dialog>
