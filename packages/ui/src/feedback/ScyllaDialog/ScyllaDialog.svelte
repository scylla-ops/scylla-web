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
    /**
     * For a dialog whose content changes size (tabs, states) between known sizes: the height of its
     * largest state, in rem. The dialog keeps that height (up to the screen). Every dialog keeps
     * its top edge at one place, so what is under the pointer never moves.
     */
    stable?: number;
    class?: string;
    /** Classes of the backdrop. */
    overlayClass?: string;
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
    stable,
    class: className,
    overlayClass,
    children,
    ...rest
  }: Props = $props();

  /**
   * The top edge never depends on the height. With `stable`, it is where a dialog of the largest
   * state is centered, so a smaller one grows down from it. Without, it is a fixed gap from the
   * top, and only the bottom moves when the content changes. The body scrolls in the room left.
   */
  const stableStyle = $derived(
    stable === undefined
      ? 'top: max(1rem, 10dvh); max-height: calc(100dvh - max(1rem, 10dvh) - 1rem);'
      : `top: max(1rem, calc(50dvh - ${stable / 2}rem)); min-height: min(${stable}rem, calc(100dvh - 2rem));`,
  );

  let openings = 0;
  const opening = $derived(open ? ++openings : openings);

  const hold = toRune(dialogHoldStore);
  const held = $derived(hold().held);

  const keepOpen = (event: Event) => {
    const { held: holding, onBlocked } = dialogHoldStore.getState();
    if (holding || dismissible !== true) event.preventDefault();
    if (holding) onBlocked?.();
  };
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent
    {...rest}
    style={stableStyle}
    {overlayClass}
    class={cn(
      (held || dismissible === false) && '[&>button]:hidden',
      held && '[&_[data-dialog-dismiss]]:hidden',
      'translate-y-0 content-start',
      // A stable dialog is a column: the body takes the free height, so the footer stays at the
      // bottom, and the buttons keep one place in every state.
      stable !== undefined &&
        'flex flex-col [&>[data-slot=icon-picker]]:flex-1 [&_[data-slot=dialog-footer]]:mt-auto',
      // The actions stay in view when the body scrolls.
      '[&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-[-1.5rem] [&_[data-slot=dialog-footer]]:-mb-6 [&_[data-slot=dialog-footer]]:bg-card [&_[data-slot=dialog-footer]]:pb-6 [&_[data-slot=dialog-footer]]:pt-2',
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
