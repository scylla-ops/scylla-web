<script lang="ts">
  import { t } from '../../i18n/index.ts';
  import { fold, unfold } from '../../motion/fold.ts';
  import type { GlyphFill, GlyphPaint } from '../../structs/glyph-avatar.struct.ts';
  import { cn } from '../../utils/index.ts';
  import ColorSwatches from '../ColorSwatches/ColorSwatches.svelte';
  import { SWATCH_COLORS } from '../ColorSwatches/color-swatches.ts';
  import SegmentedControl from '../SegmentedControl/SegmentedControl.svelte';
  import { swatchHex, swatchOf, withColor, withFill } from './glyph-avatar.ts';
  import { glyphAvatarMessages as m } from './glyph-avatar.messages.ts';

  interface Props {
    label: string;
    paint: GlyphPaint;
    onchange: (paint: GlyphPaint) => void;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** A white swatch before the colors of the theme. */
    white?: boolean;
  }

  let { label, paint, onchange, recent = [], white = false }: Props = $props();

  const id = $props.id();
  const WHITE = '#ffffff';

  const fills = $derived(
    (['solid', 'linear', 'radial'] as const).map(value => ({
      value,
      label: t({ solid: m.solid, linear: m.linear, radial: m.radial }[value]),
    })),
  );
  const isWhite = (index: number) => white && paint.colors[index] === WHITE;
  const choice = (index: number) =>
    isWhite(index) ? undefined : swatchOf(paint.colors[index] ?? WHITE, SWATCH_COLORS);
  const choose = (index: number, color: string) =>
    onchange(withColor(paint, index, swatchHex(color)));

  const SWATCH =
    'focus-visible:ring-ring/50 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow duration-150 focus-visible:ring-[3px] motion-reduce:transition-none';
</script>

{#snippet colors(index: number, labelId: string)}
  <!-- One row of equal cells: the white swatch and the others never wrap apart. -->
  <div class={cn('grid items-center justify-items-center', white ? 'grid-cols-8' : 'grid-cols-7')}>
    {#if white}
      <button
        type="button"
        aria-label={t(m.white)}
        title={t(m.white)}
        aria-pressed={isWhite(index)}
        class={cn(SWATCH, isWhite(index) && 'ring-2 ring-foreground')}
        onclick={() => choose(index, WHITE)}
      >
        <span class="size-[22px] rounded-full border border-border" style:background={WHITE}></span>
      </button>
    {/if}
    <ColorSwatches
      value={choice(index)}
      onchange={color => choose(index, color)}
      {recent}
      labelledby={labelId}
      class="contents"
    />
  </div>
{/snippet}

<div data-slot="glyph-paint-field" class="flex flex-col gap-2.5">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <span id="{id}-label" class="text-xs font-medium text-muted-foreground">{label}</span>
    <SegmentedControl
      size="sm"
      value={paint.fill}
      options={fills}
      aria-label={`${label} · ${t(m.fill)}`}
      onChange={(fill: GlyphFill) => onchange(withFill(paint, fill))}
    />
  </div>
  {@render colors(0, `${id}-label`)}
  {#if paint.fill !== 'solid'}
    <div class="flex flex-col gap-2.5" in:unfold out:fold>
      <span id="{id}-second" class="text-xs font-medium text-muted-foreground">
        {t(m.secondColor)}
      </span>
      {@render colors(1, `${id}-second`)}
      {#if paint.fill === 'linear'}
        <label class="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span class="w-16 shrink-0">{t(m.angle)}</span>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={paint.angle < 0 ? paint.angle + 360 : paint.angle}
            oninput={event => onchange({ ...paint, angle: Number(event.currentTarget.value) })}
            class="h-1.5 flex-1 cursor-pointer accent-primary"
          />
          <span class="w-10 shrink-0 text-right tabular-nums">{t(m.degrees(paint.angle))}</span>
        </label>
      {/if}
    </div>
  {/if}
</div>
