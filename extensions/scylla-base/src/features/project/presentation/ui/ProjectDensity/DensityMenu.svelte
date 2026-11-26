<script lang="ts">
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    DENSITY_LABELS,
    type ProjectDensity,
  } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import { DENSITY_ICONS } from './density-icons.registry.ts';
  import DensityRadioItems from './DensityRadioItems.svelte';

  interface Props {
    /** The density of the page. */
    value: ProjectDensity;
    /** Some sections have their own density: « Apply to all sections » gives them this one. */
    mixed: boolean;
    /** A phone: an icon button of 44 px. */
    phone: boolean;
    onChange: (density: ProjectDensity) => void;
    onApplyToAll: () => void;
  }

  let { value, mixed, phone, onChange, onApplyToAll }: Props = $props();

  const Icon = $derived(DENSITY_ICONS[value]);
  const label = $derived(t(projectMessages.displayOf(t(DENSITY_LABELS[value]))));
</script>

<!-- « Display »: the density of the page. A section can have its own, in its menu. -->
<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(
      buttonVariants({ variant: 'outline', size: phone ? 'icon' : 'default' }),
      'shrink-0',
      phone ? 'size-11 rounded-lg' : 'bg-background',
    )}
    aria-label={label}
    data-part="project-density"
  >
    <Icon class={phone ? 'size-5' : 'size-4'} aria-hidden="true" />
    {#if !phone}{t(projectMessages.display)}{/if}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-60">
    <DropdownMenuLabel class="text-xs text-muted-foreground">
      {t(projectMessages.pageDisplay)}
    </DropdownMenuLabel>
    <DensityRadioItems {value} {phone} {onChange} />
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled={!mixed} class={cn(phone && 'min-h-11')} onSelect={onApplyToAll}>
      <ListChecksIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.applyToAll)}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
