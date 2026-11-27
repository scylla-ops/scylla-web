<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { t } from '../../i18n/index.ts';
  import PreviewBlock from '../../layout/PreviewBlock.svelte';
  import ScreenStack from '../../layout/ScreenStack/ScreenStack.svelte';
  import { getScreenStack, type Screen } from '../../layout/ScreenStack/screen-stack.ts';
  import { createScreenStack } from '../../layout/ScreenStack/screen-stack.state.svelte.ts';
  import { Button } from '../../primitives/index.ts';
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
    /** Offers the tab of the glyph avatars: for a person or an App only. */
    avatar?: boolean;
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
    avatar = false,
    disabled = false,
    class: className,
  }: Props = $props();

  // The editor is a second screen: the one of the dialog around the field (`ScyllaDialog screens`),
  // else one of the field, which then takes the height of the editor.
  const outer = getScreenStack();
  const stack = outer ?? createScreenStack();

  const title = $derived(label ?? t(m.icon));
  const screen: Screen = {
    get title() {
      return title;
    },
    leading: choice,
    content: editor,
  };
  // The field goes away (the dialog closes): its screen too.
  $effect(() => () => stack.close(screen));

  // A reset builds the picker again, on the default glyph and color.
  let resets = $state(0);

  // The picker goes away at Back: the URL of a new image belongs to the field, which shows it.
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

<!-- The choice shows beside the title of the editor too: the image of the second tab, at once. -->
{#snippet choice()}
  <ChoicePreview {value} {defaultGlyph} {defaultColor} size={32} />
{/snippet}

{#snippet editor()}
  <!-- The width of a dialog, centered: on a page, the grid of the glyphs does not spread. In a
       dialog, the image tab fills the height of the screen. -->
  <div class="mx-auto flex w-full max-w-lg flex-1 flex-col" inert={disabled}>
    {#key resets}
      <IconPicker
        class="flex-1"
        header={false}
        {value}
        onchange={change}
        {recent}
        {defaultGlyph}
        {defaultColor}
        {avatar}
      />
    {/key}
  </div>
{/snippet}

{#snippet field(className?: string)}
  <PreviewBlock data-slot="icon-field" label={title} class={className}>
    {#snippet preview()}
      <ChoicePreview {value} {defaultGlyph} {defaultColor} size={72} />
    {/snippet}
    {#snippet actions()}
      <Button
        type="button"
        variant="outline"
        size="sm"
        {disabled}
        onclick={event => stack.open(screen, event.currentTarget)}
      >
        <PaletteIcon aria-hidden="true" />
        {t(m.change)}
        <ChevronRightIcon aria-hidden="true" />
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
    {/snippet}
  </PreviewBlock>
{/snippet}

{#if outer}
  {@render field(className)}
{:else}
  <!-- On a page, the editor and its Back are one column of the width of a dialog, centered. -->
  <ScreenStack {stack} class={className} screenClass="mx-auto w-full max-w-lg">
    {@render field()}
  </ScreenStack>
{/if}
