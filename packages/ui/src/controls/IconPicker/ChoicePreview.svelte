<script lang="ts">
  import EntityIcon from '../../data-display/EntityIcon/EntityIcon.svelte';
  import type { EntityIconSize } from '../../data-display/EntityIcon/entity-icon.ts';
  import { swapIn, swapOut } from '../../motion/swap.ts';
  import { choiceIconProps, choiceKey, type IconChoice } from './icon-picker.ts';

  interface Props {
    value: IconChoice;
    defaultGlyph: string;
    defaultColor: string;
    size?: EntityIconSize;
  }

  let { value, defaultGlyph, defaultColor, size = 48 }: Props = $props();
</script>

<!-- The old icon fades out over the new one: the two are in one grid cell. -->
<span data-slot="icon-preview" class="grid shrink-0 place-items-center">
  {#key choiceKey(value)}
    <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
      <EntityIcon {size} {...choiceIconProps(value, defaultGlyph, defaultColor)} />
    </span>
  {/key}
</span>
