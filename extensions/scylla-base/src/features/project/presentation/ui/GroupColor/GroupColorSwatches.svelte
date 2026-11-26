<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { ColorGlyph, ColorPicker, SWATCH_COLORS } from '@scylla/ui';
  import { Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, isHexColor } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { DEFAULT_FREE_COLOR, swatchName } from '../../presenters/group-color.presenter.ts';

  interface Props {
    /** The chosen color: a color of the theme (`chart-2`) or a free color (`#RRGGBB`). */
    value: string | undefined;
    /** A color of the theme, or each change of the free color. */
    onchange: (color: string) => void;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The element that the free color picker opens beside. Default: its button. */
    anchor?: HTMLElement | null;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    disabled?: boolean;
    /** The id of the label of the colors. */
    labelledby?: string;
  }

  let {
    value,
    onchange,
    recent = [],
    anchor,
    side = 'bottom',
    sideOffset = 8,
    disabled = false,
    labelledby,
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

<!-- The colors of the icon pickers, for a color with no glyph. -->
<div
  data-part="group-color-swatches"
  role="group"
  aria-labelledby={labelledby}
  class="flex flex-wrap items-center gap-2"
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
      aria-label={t(projectMessages.freeColor)}
      title={t(projectMessages.freeColor)}
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
    <PopoverContent {side} align="start" {sideOffset} customAnchor={anchor ?? null} class="w-auto p-3">
      <ColorPicker value={freeColor} {onchange} {recent}>
        {#snippet preview(hex)}
          <span class="flex size-9 items-center justify-center rounded-lg border">
            <ColorGlyph icon={FolderIcon} color={hex} class="size-5" />
          </span>
        {/snippet}
      </ColorPicker>
    </PopoverContent>
  </Popover>
</div>
