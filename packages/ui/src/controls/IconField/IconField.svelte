<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { t } from '../../i18n/index.ts';
  import { fold, unfold } from '../../motion/fold.ts';
  import { Button } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import ChoicePreview from '../IconPicker/ChoicePreview.svelte';
  import IconPicker from '../IconPicker/IconPicker.svelte';
  import type { IconChoice } from '../IconPicker/icon-picker.ts';
  import { iconFieldMessages as m } from './icon-field.messages.ts';

  interface Props {
    value: IconChoice;
    onchange: (choice: IconChoice) => void;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The glyph of the default icon. */
    defaultGlyph?: string;
    /** The color of the default icon, e.g. `info` for an agent. */
    defaultColor?: string;
    /** The label above the field. By default: Icon. */
    label?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    value,
    onchange,
    recent = [],
    defaultGlyph = 'folder',
    defaultColor = 'primary',
    label,
    disabled = false,
    class: className,
  }: Props = $props();

  const id = $props.id();
  let open = $state(false);
  const shown = $derived(open && !disabled);
  // A reset builds the picker again, on the default glyph and color.
  let resets = $state(0);

  // The picker closes and goes away: the URL of a new image belongs to the field, which shows it.
  let imageUrl: string | undefined;
  const revoke = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };
  $effect(() => revoke);

  const change = (choice: IconChoice) => {
    if (choice.kind === 'image' && choice.file) {
      revoke();
      imageUrl = URL.createObjectURL(choice.file);
      onchange({ ...choice, url: imageUrl });
    } else {
      onchange(choice);
    }
  };

  const reset = () => {
    resets += 1;
    onchange({ kind: 'default' });
  };
</script>

<div
  data-slot="icon-field"
  role="group"
  aria-labelledby="{id}-label"
  class={cn('flex flex-col', className)}
>
  <div class="flex flex-col gap-3">
    <span id="{id}-label" class="text-sm leading-snug font-medium">{label ?? t(m.icon)}</span>
    <div class="flex items-center gap-3">
      <ChoicePreview {value} {defaultGlyph} {defaultColor} />
      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={shown}
          aria-controls={shown ? `${id}-picker` : undefined}
          {disabled}
          onclick={() => (open = !open)}
        >
          <PaletteIcon aria-hidden="true" />
          {t(m.change)}
          <ChevronDownIcon
            aria-hidden="true"
            class={cn('transition-transform duration-200 motion-reduce:transition-none', shown && 'rotate-180')}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || value.kind === 'default'}
          onclick={reset}
        >
          <RotateCcwIcon aria-hidden="true" />
          {t(m.reset)}
        </Button>
      </div>
    </div>
  </div>
  {#if shown}
    <!-- The width of a dialog: on a page, the grid of the glyphs does not spread. The top
         padding is part of the fold, so the close leaves no gap. -->
    <div id="{id}-picker" class="w-full max-w-lg pt-4" in:unfold out:fold>
      {#key resets}
        <IconPicker
          header={false}
          {value}
          onchange={change}
          {recent}
          {defaultGlyph}
          {defaultColor}
        />
      {/key}
    </div>
  {/if}
</div>
