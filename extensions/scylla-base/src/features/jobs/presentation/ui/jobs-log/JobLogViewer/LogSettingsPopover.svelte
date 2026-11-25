<script lang="ts">
  import Settings2Icon from '@lucide/svelte/icons/settings-2';
  import { SegmentedControl } from '@scylla/ui';
  import {
    buttonVariants,
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
    LogTextSize,
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
  ] satisfies { value: LogTextSize; label: string }[]);
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
    <div class="flex items-center justify-between gap-3">
      <span id="{id}-size" class="text-sm">{t(messages.textSize)}</span>
      <SegmentedControl
        size="sm"
        aria-labelledby="{id}-size"
        value={display.current.size}
        options={sizes}
        onChange={size => display.set({ size })}
      />
    </div>
  </PopoverContent>
</Popover>
