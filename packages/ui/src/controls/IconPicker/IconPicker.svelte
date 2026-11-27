<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SmileIcon from '@lucide/svelte/icons/smile';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { fade } from 'svelte/transition';
  import EntityIcon from '../../data-display/EntityIcon/EntityIcon.svelte';
  import { t } from '../../i18n/index.ts';
  import { motionDuration } from '../../motion/reduced-motion.ts';
  import {
    Button,
    Input,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '../../primitives/index.ts';
  import { cn, isHexColor } from '../../utils/index.ts';
  import ColorSwatches from '../ColorSwatches/ColorSwatches.svelte';
  import { randomGlyphAvatar } from '../GlyphAvatar/glyph-avatar.ts';
  import GlyphAvatarEditor from '../GlyphAvatar/GlyphAvatarEditor.svelte';
  import ChoicePreview from './ChoicePreview.svelte';
  import IconImageDrop from './IconImageDrop.svelte';
  import { choiceIconProps, searchGlyphs, type IconChoice } from './icon-picker.ts';
  import { iconPickerMessages as m } from './icon-picker.messages.ts';

  interface Props {
    value: IconChoice;
    onchange: (choice: IconChoice) => void;
    /** The name of the entity, next to the preview. */
    title?: string;
    subtitle?: string;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The glyph of the default icon. */
    defaultGlyph?: string;
    /** The color of the default icon, e.g. `info` for an agent. */
    defaultColor?: string;
    /** Off in a field that shows the preview and Reset itself (`IconField`). */
    header?: boolean;
    /** Offers the tab of the glyph avatars: for a person or an App only. */
    avatar?: boolean;
    class?: string;
  }

  let {
    value,
    onchange,
    title,
    subtitle,
    recent = [],
    defaultGlyph = 'folder',
    defaultColor = 'primary',
    header = true,
    avatar = false,
    class: className,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let tab = $state(value.kind === 'image' || value.kind === 'avatar' ? value.kind : 'icon');
  let search = $state('');
  const colorLabel = $props.id();
  let root = $state<HTMLElement | null>(null);

  // The glyph and the color stay while an image is chosen, for a return to the glyph.
  // svelte-ignore state_referenced_locally
  let glyph = $state(value.kind === 'glyph' ? value.name : defaultGlyph);
  // svelte-ignore state_referenced_locally
  let color = $state(value.kind === 'glyph' ? value.color : defaultColor);

  // The avatar of the tab: the avatar of the entity, else a random one, which the first change takes.
  // svelte-ignore state_referenced_locally
  const avatarStart = value.kind === 'avatar' ? value.avatar : randomGlyphAvatar();

  const glyphs = $derived(searchGlyphs(search));
  // The default icon is the default glyph in the default color.
  const selectedGlyph = $derived(
    value.kind === 'glyph' ? value.name : value.kind === 'default' ? defaultGlyph : undefined,
  );
  const selectedColor = $derived(
    value.kind === 'glyph' ? value.color : value.kind === 'default' ? defaultColor : undefined,
  );
  const glyphColor = (name: string) => (isHexColor(name) ? name : `var(--${name})`);

  const chooseGlyph = (name: string) => {
    glyph = name;
    onchange({ kind: 'glyph', name, color });
  };

  const chooseColor = (next: string) => {
    color = next;
    onchange({ kind: 'glyph', name: glyph, color: next });
  };

  const reset = () => {
    glyph = defaultGlyph;
    color = defaultColor;
    onchange({ kind: 'default' });
  };

  // The URL of a new image lives as long as the picker: the preview shows it, the save sends the file.
  let objectUrl: string | undefined;
  const revoke = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
  $effect(() => revoke);

  const chooseImage = (file: File) => {
    revoke();
    objectUrl = URL.createObjectURL(file);
    onchange({ kind: 'image', url: objectUrl, file });
  };
</script>

<div bind:this={root} data-slot="icon-picker" class={cn('flex flex-col gap-4', className)}>
  {#if header}
    <div class="flex h-12 items-center gap-3">
      <ChoicePreview {value} {defaultGlyph} {defaultColor} />
      <div class="flex min-w-0 flex-1 flex-col justify-center">
        <span class="truncate text-sm font-semibold">{title}</span>
        {#if subtitle}
          <span class="text-muted-foreground truncate text-xs">{subtitle}</span>
        {/if}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={value.kind === 'default'}
        onclick={reset}
      >
        <RotateCcwIcon aria-hidden="true" />
        {t(m.reset)}
      </Button>
    </div>
  {/if}

  <Tabs bind:value={tab} class="flex flex-col gap-4">
    <TabsList class="w-full">
      <TabsTrigger value="icon"><PaletteIcon aria-hidden="true" />{t(m.iconTab)}</TabsTrigger>
      <TabsTrigger value="image"><UploadIcon aria-hidden="true" />{t(m.imageTab)}</TabsTrigger>
      {#if avatar}
        <TabsTrigger value="avatar"><SmileIcon aria-hidden="true" />{t(m.avatarTab)}</TabsTrigger>
      {/if}
    </TabsList>

    <TabsContent value="icon">
      <!-- A change of tab fades the new content in. -->
      <div class="flex flex-col gap-4" in:fade={{ duration: motionDuration(150) }}>
        <div class="relative">
          <SearchIcon
            class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            bind:value={search}
            placeholder={t(m.search)}
            aria-label={t(m.search)}
            class="pl-8"
          />
        </div>

        <!-- Four rows: the dialog keeps its height while the search filters the glyphs. -->
        <div class="relative h-[188px] overflow-y-auto">
          {#if glyphs.length === 0}
            <p class="text-muted-foreground flex h-11 items-center justify-center text-sm">
              {t(m.noGlyph)}
            </p>
          {:else}
            <div class="grid grid-cols-8 gap-1">
              {#each glyphs as option (option.name)}
                {@const selected = option.name === selectedGlyph}
                <div class="flex h-11 items-center justify-center">
                  <button
                    type="button"
                    aria-label={option.name}
                    aria-pressed={selected}
                    title={option.name}
                    class={cn(
                      'focus-visible:ring-ring/50 flex size-9 cursor-pointer items-center justify-center rounded-lg transition-[background-color,box-shadow,color] duration-150 outline-none motion-reduce:transition-none focus-visible:ring-[3px]',
                      selected
                        ? 'bg-secondary text-secondary-foreground ring-primary ring-2'
                        : 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                    )}
                    onclick={() => chooseGlyph(option.name)}
                  >
                    <option.icon
                      class="size-5"
                      aria-hidden="true"
                      color={selected && selectedColor ? glyphColor(selectedColor) : undefined}
                    />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <span id={colorLabel} class="text-muted-foreground text-xs font-medium">{t(m.color)}</span>
          <ColorSwatches
            labelledby={colorLabel}
            value={selectedColor}
            onchange={chooseColor}
            {recent}
            anchor={root}
            side="right"
            sideOffset={32}
          >
            {#snippet preview(hex)}
              <EntityIcon
                size={36}
                icon={choiceIconProps({ kind: 'glyph', name: glyph, color: hex }, defaultGlyph).icon}
                color={hex}
              />
            {/snippet}
          </ColorSwatches>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="image">
      <div in:fade={{ duration: motionDuration(150) }}>
        <IconImageDrop onfile={chooseImage} />
      </div>
    </TabsContent>

    {#if avatar}
      <TabsContent value="avatar">
        <!-- The preview of the picker shows the avatar: the editor has no preview of its own. -->
        <div in:fade={{ duration: motionDuration(150) }}>
          <GlyphAvatarEditor
            value={avatarStart}
            onchange={next => onchange({ kind: 'avatar', avatar: next })}
            preview={false}
            square
            {recent}
          />
        </div>
      </TabsContent>
    {/if}
  </Tabs>
</div>
