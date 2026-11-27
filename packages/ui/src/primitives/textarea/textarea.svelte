<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLTextareaAttributes & {
    value?: string | null;
    /** The height at rest, in lines. */
    minRows?: number;
    /** The height at which the text starts to scroll, in lines. */
    maxRows?: number;
  };

  let {
    class: className,
    value = $bindable(''),
    minRows = 3,
    maxRows = 8,
    ...rest
  }: Props = $props();

  let element = $state<HTMLTextAreaElement>();
  // After a drag on the bottom edge the height belongs to the user: no more auto-grow.
  let resized = $state(false);
  let autoHeight = 0;

  const lineOf = (el: HTMLElement): number => {
    const style = getComputedStyle(el);
    return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
  };

  const grow = () => {
    const el = element;
    if (!el || resized) return;
    const style = getComputedStyle(el);
    const frame =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    const line = lineOf(el);
    el.style.height = 'auto';
    const wanted = Math.min(Math.max(el.scrollHeight + (el.offsetHeight - el.clientHeight), 0), line * maxRows + frame);
    autoHeight = Math.max(wanted, line * minRows + frame);
    el.style.height = `${autoHeight}px`;
  };

  $effect(() => {
    void value;
    grow();
  });

  // The drag changes the height without an event of the text: compare at the end of the gesture.
  const settle = () => {
    if (element && !resized && Math.abs(element.offsetHeight - autoHeight) > 2) {
      resized = true;
      element.style.maxHeight = 'none';
    }
  };
</script>

<!-- The look of `Input`, on several lines: it grows with the text, and the user can drag its
bottom edge. -->
<textarea
  bind:this={element}
  data-slot="textarea"
  bind:value
  rows={minRows}
  onpointerup={settle}
  class={cn(
    'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-border w-full min-w-0 resize-y rounded-lg border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
    className,
  )}
  {...rest}
></textarea>
