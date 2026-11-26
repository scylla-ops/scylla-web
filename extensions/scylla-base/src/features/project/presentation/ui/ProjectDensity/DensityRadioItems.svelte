<script lang="ts">
  import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    DENSITY_LABELS,
    isDensity,
    PROJECT_DENSITIES,
    type ProjectDensity,
  } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import { DENSITY_ICONS } from './density-icons.registry.ts';

  interface Props {
    value: ProjectDensity;
    /** A finger: each item is 44 px high. */
    phone?: boolean;
    onChange: (density: ProjectDensity) => void;
  }

  let { value, phone = false, onChange }: Props = $props();

  const pick = (next: string) => {
    if (isDensity(next)) onChange(next);
  };
</script>

<!-- The four densities, in the toolbar menu « Display » and in the menu of a section. -->
<DropdownMenuRadioGroup {value} onValueChange={pick}>
  {#each PROJECT_DENSITIES as density (density)}
    {@const Icon = DENSITY_ICONS[density]}
    <DropdownMenuRadioItem
      value={density}
      class={cn(phone && 'min-h-11')}
      data-density={density}
    >
      <Icon class="size-4" aria-hidden="true" />
      {t(DENSITY_LABELS[density])}
    </DropdownMenuRadioItem>
  {/each}
</DropdownMenuRadioGroup>
