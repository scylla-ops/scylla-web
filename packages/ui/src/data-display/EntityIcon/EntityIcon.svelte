<script lang="ts">
  import { currentTheme } from '../../stores/index.ts';
  import { cn, iconColors } from '../../utils/index.ts';
  import { ENTITY_ICON_SIZES, type EntityIconProps } from './entity-icon.ts';

  let {
    icon: Icon,
    color = 'primary',
    image,
    size = 36,
    label,
    class: className,
  }: EntityIconProps = $props();

  // A broken image (deleted on the server) falls back to the glyph.
  let failedImage = $state<string | undefined>();
  const showImage = $derived(!!image && failedImage !== image);
  const colors = $derived(iconColors(color, currentTheme()));
  const sizes = $derived(ENTITY_ICON_SIZES[size]);
</script>

<span
  data-slot="entity-icon"
  data-solid={!showImage && colors.solid ? '' : undefined}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  class={cn('inline-flex shrink-0 items-center justify-center overflow-hidden', sizes.tile, className)}
  style:background={showImage ? undefined : colors.tile}
>
  {#if showImage}
    <img
      src={image}
      alt=""
      draggable="false"
      class="size-full object-cover"
      onerror={() => (failedImage = image)}
    />
  {:else if Icon}
    <Icon class={sizes.glyph} color={colors.glyph} aria-hidden="true" />
  {/if}
</span>
