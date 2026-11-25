<script lang="ts">
  import Settings2Icon from '@lucide/svelte/icons/settings-2';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { SegmentedControl } from '@scylla/ui';
  import {
    buttonVariants,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Switch,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { jobLogMessages as messages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type {
    LogDisplay,
    LogDisplaySettings,
    LogTextSizePreset,
  } from '../log-display-settings.state.svelte.ts';
  import {
    LOG_TEXT_SIZE_MAX,
    LOG_TEXT_SIZE_MIN,
    LOG_TEXT_SIZE_PRESETS,
    clampLogTextSize,
  } from '../log-display-settings.state.svelte.ts';

  interface Props {
    display: LogDisplay;
  }

  let { display }: Props = $props();

  const id = $props.id();

  const toggles = $derived([
    { key: 'ansi', label: t(messages.ansiColors), hint: t(messages.ansiColorsHint) },
    { key: 'wrap', label: t(messages.wrap), hint: '' },
    { key: 'timestamps', label: t(messages.timestamps), hint: '' },
    { key: 'lineNumbers', label: t(messages.lineNumbers), hint: '' },
  ] satisfies { key: keyof LogDisplaySettings; label: string; hint: string }[]);

  const sizes = $derived([
    { value: 's', label: t(messages.sizeSmall) },
    { value: 'm', label: t(messages.sizeMedium) },
    { value: 'l', label: t(messages.sizeLarge) },
  ] satisfies { value: LogTextSizePreset | ''; label: string }[]);

  // No preset is selected for a custom size.
  const preset = $derived(
    (Object.keys(LOG_TEXT_SIZE_PRESETS) as LogTextSizePreset[]).find(
      key => LOG_TEXT_SIZE_PRESETS[key] === display.current.size,
    ) ?? '',
  );

  let draft = $state<string | null>(null);

  const setSize = (size: number) => {
    draft = null;
    display.set({ size: clampLogTextSize(size) });
  };

  // An empty or invalid text goes back to the saved size.
  const commit = (text: string) => {
    const size = Number.parseFloat(text);
    if (Number.isFinite(size)) setSize(size);
    else draft = null;
  };
</script>

<!-- The settings of the viewer, kept in the browser for the next job. -->
<Popover>
  <PopoverTrigger
    class={cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'size-8 shrink-0 text-muted-foreground hover:text-foreground',
    )}
  >
    <Settings2Icon class="size-4" aria-hidden="true" />
    <span class="sr-only">{t(messages.settings)}</span>
  </PopoverTrigger>
  <PopoverContent align="end" class="flex w-72 flex-col gap-3 p-3" aria-label={t(messages.settings)}>
    <p class="text-sm font-medium text-foreground">{t(messages.settings)}</p>
    {#each toggles as toggle (toggle.key)}
      <Label class="flex cursor-pointer items-center justify-between gap-3 font-normal">
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="text-sm">{toggle.label}</span>
          {#if toggle.hint}
            <span id="{id}-{toggle.key}" class="text-xs text-muted-foreground">{toggle.hint}</span>
          {/if}
        </span>
        <Switch
          aria-describedby={toggle.hint ? `${id}-${toggle.key}` : undefined}
          bind:checked={
            () => display.current[toggle.key] as boolean,
            checked => display.set({ [toggle.key]: checked })
          }
        />
      </Label>
    {/each}
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3">
        <span id="{id}-size" class="text-sm">{t(messages.textSize)}</span>
        <SegmentedControl
          size="sm"
          aria-labelledby="{id}-size"
          value={preset}
          options={sizes}
          onChange={size => size && setSize(LOG_TEXT_SIZE_PRESETS[size])}
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <Label for="{id}-custom-size" class="text-sm font-normal">{t(messages.customSize)}</Label>
        <div class="flex items-center gap-1" role="group" aria-labelledby="{id}-size">
          <button
            type="button"
            class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-8')}
            disabled={display.current.size <= LOG_TEXT_SIZE_MIN}
            onclick={() => setSize(display.current.size - 1)}
          >
            <MinusIcon class="size-4" aria-hidden="true" />
            <span class="sr-only">{t(messages.decreaseSize)}</span>
          </button>
          <Input
            id="{id}-custom-size"
            aria-label={t(messages.customSize)}
            type="number"
            inputmode="numeric"
            min={LOG_TEXT_SIZE_MIN}
            max={LOG_TEXT_SIZE_MAX}
            step={1}
            class="w-16 [appearance:textfield] px-1 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={draft ?? display.current.size}
            oninput={event => (draft = event.currentTarget.value)}
            onchange={event => commit(event.currentTarget.value)}
            onblur={event => commit(event.currentTarget.value)}
          />
          <button
            type="button"
            class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-8')}
            disabled={display.current.size >= LOG_TEXT_SIZE_MAX}
            onclick={() => setSize(display.current.size + 1)}
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            <span class="sr-only">{t(messages.increaseSize)}</span>
          </button>
          <span class="text-xs text-muted-foreground" aria-hidden="true">px</span>
        </div>
      </div>
    </div>
  </PopoverContent>
</Popover>
