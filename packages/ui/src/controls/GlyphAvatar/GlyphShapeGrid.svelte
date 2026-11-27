<script lang="ts">
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { t } from '../../i18n/index.ts';
  import {
    GLYPH_SHAPES,
    SCYLLA_SHAPE,
    type GlyphAvatar,
  } from '../../structs/glyph-avatar.struct.ts';
  import { cn } from '../../utils/index.ts';
  import { glyphDataUri } from './glyph-avatar.ts';
  import { glyphAvatarMessages as m } from './glyph-avatar.messages.ts';

  interface Props {
    /** The avatar of the editor: each tile shows its shape in the colors of the avatar. */
    avatar: GlyphAvatar;
    onchange: (shape: string) => void;
    labelledby?: string;
  }

  let { avatar, onchange, labelledby }: Props = $props();

  const label = (shape: string, index: number) =>
    shape === SCYLLA_SHAPE ? t(m.scyllaHead) : t(m.shapeNumber(index + 1));
</script>

<div
  data-slot="glyph-shape-grid"
  role="group"
  aria-labelledby={labelledby}
  class="grid grid-cols-6 gap-1.5 sm:grid-cols-8"
>
  {#each GLYPH_SHAPES as shape, index (shape)}
    {@const selected = shape === avatar.shape}
    {@const special = shape === SCYLLA_SHAPE}
    <button
      type="button"
      aria-label={label(shape, index)}
      aria-pressed={selected}
      title={label(shape, index)}
      data-special={special || undefined}
      class={cn(
        'relative flex aspect-square cursor-pointer items-center justify-center rounded-lg p-0.5 outline-none transition-[box-shadow,transform] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
        selected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-border',
        special && !selected && 'ring-1 ring-primary/40',
      )}
      onclick={() => onchange(shape)}
    >
      <img
        src={glyphDataUri({ ...avatar, shape })}
        alt=""
        draggable="false"
        class="size-full rounded-md"
      />
      {#if special}
        <span
          aria-hidden="true"
          class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
        >
          <SparklesIcon class="size-2.5" />
        </span>
      {/if}
    </button>
  {/each}
</div>
