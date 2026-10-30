<script lang="ts">
  import { Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    currentThemePreference,
    setThemePreference,
    type ThemePreference,
  } from '@scylla/ui/stores';
  import { cn } from '@scylla/ui/utils';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';
  import ThemePreview from './ThemePreview.svelte';

  const id = $props.id();

  const options = [
    { value: 'light', label: userMessages.themeLight },
    { value: 'dark', label: userMessages.themeDark },
    { value: 'system', label: userMessages.themeSystem },
  ] as const;

  const previews = $state<Partial<Record<ThemePreference, HTMLElement>>>({});

  // The new theme spreads from the center of the chosen thumbnail, for a click and for the keyboard.
  const choose = (value: string) => {
    const preference = value as ThemePreference;
    const box = previews[preference]?.getBoundingClientRect();
    setThemePreference(
      preference,
      box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined,
    );
  };
</script>

<RadioGroup
  value={currentThemePreference()}
  onValueChange={choose}
  aria-label={t(userMessages.appearance)}
  class="grid gap-4 sm:grid-cols-3"
>
  {#each options as option (option.value)}
    {@const selected = currentThemePreference() === option.value}
    <div class="flex flex-col gap-2.5">
      <Label
        for="{id}-{option.value}"
        class={cn(
          'relative block aspect-video cursor-pointer overflow-hidden rounded-lg border transition-[border-color,box-shadow]',
          selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-input',
        )}
      >
        <span bind:this={previews[option.value]} class="absolute inset-0 block" aria-hidden="true">
          {#if option.value === 'system'}
            <ThemePreview theme="light" />
            <span class="absolute inset-0 block [clip-path:inset(0_0_0_50%)]">
              <ThemePreview theme="dark" />
            </span>
          {:else}
            <ThemePreview theme={option.value} />
          {/if}
        </span>
      </Label>
      <div class="flex items-center gap-2">
        <RadioGroupItem value={option.value} id="{id}-{option.value}" />
        <Label for="{id}-{option.value}" class="cursor-pointer text-sm font-medium">
          {t(option.label)}
        </Label>
      </div>
    </div>
  {/each}
</RadioGroup>
