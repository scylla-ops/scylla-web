<script lang="ts">
  import type { LucideIcon } from '../../icon.ts';
  import { currentTheme } from '../../stores/index.ts';
  import { cn, iconColors } from '../../utils/index.ts';

  interface Props {
    /** The glyph, e.g. a folder. */
    icon: LucideIcon;
    /** A color of the theme (`chart-2`) or a free color `#RRGGBB`. Unset: grey, with no fill. */
    color?: string;
    /** The accessible name. With none, the glyph is decorative. */
    label?: string;
    class?: string;
  }

  let { icon: Icon, color, label, class: className }: Props = $props();

  // The outline in the color on its tint. A free color under 3:1 with the card fills the glyph,
  // and the outline is white or near-black: the rules of `EntityIcon`.
  const colors = $derived(color ? iconColors(color, currentTheme()) : undefined);
</script>

<!-- A glyph in a color, with no tile: the folder of a group of projects. A new color fades in. -->
<span
  data-slot="color-glyph"
  data-solid={colors?.solid ? '' : undefined}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  class={cn('inline-flex size-4 shrink-0 items-center justify-center', className)}
>
  <Icon
    class={cn(
      'size-full transition-[color,fill,stroke] duration-200 motion-reduce:transition-none',
      !colors && 'text-muted-foreground',
    )}
    color={colors?.glyph ?? 'currentColor'}
    fill={colors?.tile ?? 'none'}
    aria-hidden="true"
  />
</span>
