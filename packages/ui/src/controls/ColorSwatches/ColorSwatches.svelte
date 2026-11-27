<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../../i18n/index.ts';
  import { Popover, PopoverContent, PopoverTrigger } from '../../primitives/index.ts';
  import { cn, isHexColor } from '../../utils/index.ts';
  import ColorPicker from '../ColorPicker/ColorPicker.svelte';
  import { colorSwatchesMessages as m } from './color-swatches.messages.ts';
  import { DEFAULT_FREE_COLOR, SWATCH_COLORS, swatchName } from './color-swatches.ts';

  interface Props {
    /** The chosen color: a color of the theme (`chart-2`) or a free color (`#RRGGBB`). */
    value: string | undefined;
    /** A color of the theme, or each change of the free color. */
    onchange: (color: string) => void;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The live preview of the free color, in its picker. */
    preview?: Snippet<[string]>;
    /** The element that the free color picker opens beside. Default: its button. */
    anchor?: HTMLElement | null;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    disabled?: boolean;
    /** The id of the label of the colors. */
    labelledby?: string;
    class?: string;
  }

  let {
    value,
    onchange,
    recent = [],
    preview,
    anchor,
    side = 'bottom',
    sideOffset = 8,
    disabled = false,
    labelledby,
    class: className,
  }: Props = $props();

  let open = $state(false);
  const free = $derived(!!value && isHexColor(value));
  const freeColor = $derived(free && value ? value : (recent[0] ?? DEFAULT_FREE_COLOR));

  // The picker chooses its color as it opens: what it shows is the choice.
  const openFreeColor = (next: boolean) => {
    open = next;
    if (next && !free) onchange(freeColor);
  };

  const ITEM =
    'focus-visible:ring-ring/50 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow duration-150 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
</script>

<div
  data-slot="color-swatches"
  role="group"
  aria-labelledby={labelledby}
  class={cn('flex flex-wrap items-center gap-2', className)}
>
  {#each SWATCH_COLORS as token (token)}
    {@const selected = value === token}
    <button
      type="button"
      aria-label={t(swatchName(token))}
      title={t(swatchName(token))}
      aria-pressed={selected}
      {disabled}
      class={cn(ITEM, selected && 'ring-foreground ring-2')}
      onclick={() => onchange(token)}
    >
      <span class="size-[22px] rounded-full" style:background="var(--{token})"></span>
    </button>
  {/each}
  <Popover {open} onOpenChange={openFreeColor}>
    <PopoverTrigger
      aria-label={t(m.freeColor)}
      title={t(m.freeColor)}
      aria-pressed={free}
      {disabled}
      class={cn(ITEM, free && 'ring-foreground ring-2')}
    >
      <span
        class="flex size-[22px] items-center justify-center rounded-full"
        style:background="conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
      >
        <span class="ring-background size-3.5 rounded-full ring-2" style:background={freeColor}
        ></span>
      </span>
    </PopoverTrigger>
    <PopoverContent
      {side}
      align="start"
      {sideOffset}
      customAnchor={anchor ?? null}
      class="w-auto p-3"
    >
      <ColorPicker value={freeColor} {onchange} {recent} {preview} />
    </PopoverContent>
  </Popover>
</div>
