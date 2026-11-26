<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import DicesIcon from '@lucide/svelte/icons/dices';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { t } from '../../i18n/index.ts';
  import { fold, unfold } from '../../motion/fold.ts';
  import { swapIn, swapOut } from '../../motion/swap.ts';
  import { Button } from '../../primitives/index.ts';
  import {
    GLYPH_SCALE,
    glyphAvatarKey,
    type GlyphAvatar,
    type GlyphFlip,
  } from '../../structs/glyph-avatar.struct.ts';
  import { cn } from '../../utils/index.ts';
  import SegmentedControl from '../SegmentedControl/SegmentedControl.svelte';
  import { glyphDataUri } from './glyph-avatar.ts';
  import { glyphAvatarMessages as m } from './glyph-avatar.messages.ts';
  import { createGlyphEditor } from './glyph-editor.state.svelte.ts';
  import GlyphAvatarCredit from './GlyphAvatarCredit.svelte';
  import GlyphPaintField from './GlyphPaintField.svelte';
  import GlyphShapeGrid from './GlyphShapeGrid.svelte';

  interface Props {
    /** The avatar at the opening: Reset goes back to it. */
    value: GlyphAvatar;
    /** Each change of the draft. */
    onchange: (avatar: GlyphAvatar) => void;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** A large preview beside the controls (a dialog), or none (a tab with its own preview). */
    preview?: boolean;
    /** The preview of an App: a rounded square, as its icon shows. A person is round. */
    square?: boolean;
    class?: string;
  }

  let {
    value,
    onchange,
    recent = [],
    preview = true,
    square = false,
    class: className,
  }: Props = $props();

  const editor = createGlyphEditor(
    () => value,
    avatar => onchange(avatar),
  );
  const id = $props.id();
  let more = $state(false);

  const flips = $derived(
    (['none', 'horizontal', 'vertical', 'both'] as const).map(flip => ({
      value: flip,
      label: t(
        {
          none: m.flipNone,
          horizontal: m.flipHorizontal,
          vertical: m.flipVertical,
          both: m.flipBoth,
        }[flip],
      ),
    })),
  );
</script>

{#snippet actions()}
  <div class="flex items-center justify-center gap-2">
    <Button type="button" variant="outline" size="sm" onclick={editor.random}>
      <DicesIcon aria-hidden="true" />
      {t(m.random)}
    </Button>
    <!-- With no preview, the owner shows the preview and its own Reset (`IconPicker`). -->
    {#if preview}
      <Button type="button" variant="ghost" size="sm" disabled={!editor.changed} onclick={editor.reset}>
        <RotateCcwIcon aria-hidden="true" />
        {t(m.reset)}
      </Button>
    {/if}
  </div>
{/snippet}

{#snippet range(label: string, min: number, max: number, step: number, current: number, text: string, set: (value: number) => void)}
  <label class="flex items-center gap-3 text-xs font-medium text-muted-foreground">
    <span class="w-16 shrink-0">{label}</span>
    <input
      type="range"
      {min}
      {max}
      {step}
      value={current}
      oninput={event => set(Number(event.currentTarget.value))}
      class="h-1.5 flex-1 cursor-pointer accent-primary"
    />
    <span class="w-12 shrink-0 text-right tabular-nums">{text}</span>
  </label>
{/snippet}

<div
  data-slot="glyph-avatar-editor"
  class={cn('grid gap-6', preview && 'md:grid-cols-[176px_minmax(0,1fr)]', className)}
>
  {#if preview}
    <div class="flex flex-col items-center gap-4 md:sticky md:top-0 md:self-start">
      <!-- The old image fades out over the new one: the two are in one grid cell. -->
      <span
        role="img"
        aria-label={t(m.preview)}
        class={cn(
          'grid size-36 shrink-0 place-items-center overflow-hidden shadow-sm ring-1 ring-border',
          square ? 'rounded-[25%]' : 'rounded-full',
        )}
      >
        {#key glyphAvatarKey(editor.avatar)}
          <img
            src={glyphDataUri(editor.avatar)}
            alt=""
            draggable="false"
            class="col-start-1 row-start-1 size-full"
            in:swapIn
            out:swapOut
          />
        {/key}
      </span>
      {@render actions()}
      <GlyphAvatarCredit class="text-center" />
    </div>
  {/if}

  <div class="flex min-w-0 flex-col gap-5">
    {#if !preview}
      <div class="flex justify-end">{@render actions()}</div>
    {/if}
    <div class="flex flex-col gap-2">
      <span id="{id}-shape" class="text-xs font-medium text-muted-foreground">{t(m.shape)}</span>
      <GlyphShapeGrid avatar={editor.avatar} onchange={editor.shape} labelledby="{id}-shape" />
    </div>
    <GlyphPaintField
      label={t(m.glyphColor)}
      paint={editor.avatar.glyph}
      onchange={paint => editor.paint('glyph', paint)}
      {recent}
      white
    />
    <GlyphPaintField
      label={t(m.background)}
      paint={editor.avatar.background}
      onchange={paint => editor.paint('background', paint)}
      {recent}
      white
    />
    <div class="flex flex-col gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="-ml-1.5 self-start"
        aria-expanded={more}
        aria-controls="{id}-more"
        onclick={() => (more = !more)}
      >
        {t(m.more)}
        <ChevronDownIcon
          aria-hidden="true"
          class={cn('transition-transform duration-200 motion-reduce:transition-none', more && 'rotate-180')}
        />
      </Button>
      {#if more}
        <div id="{id}-more" class="flex flex-col gap-3" in:unfold out:fold>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground">{t(m.flip)}</span>
            <SegmentedControl
              size="sm"
              value={editor.avatar.flip}
              options={flips}
              aria-label={t(m.flip)}
              onChange={(flip: GlyphFlip) => editor.flip(flip)}
            />
          </div>
          {@render range(t(m.rotate), -180, 180, 5, editor.avatar.rotate, t(m.degrees(editor.avatar.rotate)), editor.rotate)}
          {@render range(t(m.scale), GLYPH_SCALE.min, GLYPH_SCALE.max, 5, editor.avatar.scale, t(m.percent(editor.avatar.scale)), editor.scale)}
        </div>
      {/if}
    </div>
    {#if !preview}
      <GlyphAvatarCredit />
    {/if}
  </div>
</div>
