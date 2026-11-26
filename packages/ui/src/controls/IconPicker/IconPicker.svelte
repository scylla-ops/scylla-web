<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import EntityIcon from '../../data-display/EntityIcon/EntityIcon.svelte';
  import { t } from '../../i18n/index.ts';
  import {
    Button,
    Input,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '../../primitives/index.ts';
  import { cn, isHexColor } from '../../utils/index.ts';
  import ColorPicker from '../ColorPicker/ColorPicker.svelte';
  import IconImageDrop from './IconImageDrop.svelte';
  import {
    choiceIconProps,
    searchGlyphs,
    SWATCH_COLORS,
    type IconChoice,
  } from './icon-picker.ts';
  import { iconPickerMessages as m } from './icon-picker.messages.ts';

  interface Props {
    value: IconChoice;
    onchange: (choice: IconChoice) => void;
    /** The name of the entity, next to the preview. */
    title: string;
    subtitle?: string;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The glyph of the default icon. */
    defaultGlyph?: string;
    class?: string;
  }

  let {
    value,
    onchange,
    title,
    subtitle,
    recent = [],
    defaultGlyph = 'folder',
    class: className,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let tab = $state(value.kind === 'image' ? 'image' : 'icon');
  let search = $state('');
  let colorOpen = $state(false);
  let root = $state<HTMLElement | null>(null);

  // The glyph and the color stay while an image is chosen, for a return to the glyph.
  // svelte-ignore state_referenced_locally
  let glyph = $state(value.kind === 'glyph' ? value.name : defaultGlyph);
  // svelte-ignore state_referenced_locally
  let color = $state(value.kind === 'glyph' ? value.color : 'primary');

  const glyphs = $derived(searchGlyphs(search));
  const freeColor = $derived(isHexColor(color) ? color : (recent[0] ?? '#E879F9'));
  // The default icon is the default glyph in the main color.
  const selectedGlyph = $derived(
    value.kind === 'glyph' ? value.name : value.kind === 'default' ? defaultGlyph : undefined,
  );
  const selectedColor = $derived(
    value.kind === 'glyph' ? value.color : value.kind === 'default' ? 'primary' : undefined,
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

  const swatchName = (token: string, index: number) =>
    token === 'primary' ? t(m.mainColor) : token === 'muted-foreground' ? t(m.grey) : t(m.chartColor(index + 1));

  const reset = () => {
    glyph = defaultGlyph;
    color = 'primary';
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

  const openFreeColor = (open: boolean) => {
    colorOpen = open;
    if (open && !isHexColor(color)) chooseColor(freeColor);
  };
</script>

<div bind:this={root} data-slot="icon-picker" class={cn('flex flex-col gap-4', className)}>
  <div class="flex h-12 items-center gap-3">
    <EntityIcon size={48} {...choiceIconProps(value, defaultGlyph)} />
    <div class="flex min-w-0 flex-1 flex-col justify-center">
      <span class="truncate text-sm font-semibold">{title}</span>
      {#if subtitle}
        <span class="text-muted-foreground truncate text-xs">{subtitle}</span>
      {/if}
    </div>
    <Button variant="ghost" size="sm" disabled={value.kind === 'default'} onclick={reset}>
      <RotateCcwIcon aria-hidden="true" />
      {t(m.reset)}
    </Button>
  </div>

  <Tabs bind:value={tab} class="flex flex-col gap-4">
    <TabsList class="w-full">
      <TabsTrigger value="icon"><PaletteIcon aria-hidden="true" />{t(m.iconTab)}</TabsTrigger>
      <TabsTrigger value="image"><UploadIcon aria-hidden="true" />{t(m.imageTab)}</TabsTrigger>
    </TabsList>

    <TabsContent value="icon" class="flex flex-col gap-4">
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
                    'focus-visible:ring-ring/50 flex size-9 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-[3px]',
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
        <span class="text-muted-foreground text-xs font-medium">{t(m.color)}</span>
        <div class="flex flex-wrap items-center gap-2">
          {#each SWATCH_COLORS as token, index (token)}
            {@const selected = selectedColor === token}
            <button
              type="button"
              aria-label={swatchName(token, index)}
              aria-pressed={selected}
              class={cn(
                'focus-visible:ring-ring/50 flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-[3px]',
                selected && 'ring-foreground ring-2',
              )}
              onclick={() => chooseColor(token)}
            >
              <span class="size-[22px] rounded-full" style:background="var(--{token})"></span>
            </button>
          {/each}
          <Popover open={colorOpen} onOpenChange={openFreeColor}>
            <PopoverTrigger
              aria-label={t(m.freeColor)}
              aria-pressed={value.kind === 'glyph' && isHexColor(value.color)}
              class={cn(
                'focus-visible:ring-ring/50 flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-[3px]',
                value.kind === 'glyph' && isHexColor(value.color) && 'ring-foreground ring-2',
              )}
            >
              <span
                class="flex size-[22px] items-center justify-center rounded-full"
                style:background="conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
              >
                <span
                  class="ring-background size-3.5 rounded-full ring-2"
                  style:background={freeColor}
                ></span>
              </span>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={32}
              customAnchor={root}
              class="w-auto p-3"
            >
              <ColorPicker value={freeColor} onchange={chooseColor} {recent}>
                {#snippet preview(hex)}
                  <EntityIcon size={36} icon={choiceIconProps({ kind: 'glyph', name: glyph, color: hex }, defaultGlyph).icon} color={hex} />
                {/snippet}
              </ColorPicker>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="image">
      <IconImageDrop onfile={chooseImage} />
    </TabsContent>
  </Tabs>
</div>
