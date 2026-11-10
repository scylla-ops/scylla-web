<script module lang="ts">
  import AlignCenterIcon from '@lucide/svelte/icons/align-center';
  import AlignLeftIcon from '@lucide/svelte/icons/align-left';
  import AlignRightIcon from '@lucide/svelte/icons/align-right';
  import {
    ToggleGroup,
    ToggleGroupItem,
    type ToggleSize,
    type ToggleVariant,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const VARIANTS = ['default', 'outline'] as const satisfies ToggleVariant[];
  const SIZES = ['sm', 'default', 'lg'] as const satisfies ToggleSize[];

  const { Story } = defineMeta({
    title: 'Primitives/ToggleGroup',
    component: ToggleGroup,
    subcomponents: { ToggleGroupItem },
  });
</script>

{#snippet items()}
  <ToggleGroupItem value="left" aria-label="Left"><AlignLeftIcon /></ToggleGroupItem>
  <ToggleGroupItem value="center" aria-label="Center"><AlignCenterIcon /></ToggleGroupItem>
  <ToggleGroupItem value="right" aria-label="Right"><AlignRightIcon /></ToggleGroupItem>
{/snippet}

<Story name="Variants and sizes" asChild>
  <div class="grid gap-6">
    {#each VARIANTS as variant (variant)}
      <div class="flex flex-wrap items-end gap-8">
        {#each SIZES as size (size)}
          <Specimen label="{variant}, {size}">
            <ToggleGroup type="single" value="left" {variant} {size}>{@render items()}</ToggleGroup>
          </Specimen>
        {/each}
        <Specimen label="{variant}, spacing 1">
          <ToggleGroup type="single" value="left" {variant} spacing={1}>{@render items()}</ToggleGroup>
        </Specimen>
      </div>
    {/each}
  </div>
</Story>

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="multiple">
      <ToggleGroup type="multiple" value={['left', 'right']} variant="outline">{@render items()}</ToggleGroup>
    </Specimen>
    <Specimen label="hover" state="hover">
      <ToggleGroup type="single" variant="outline">{@render items()}</ToggleGroup>
    </Specimen>
    <Specimen label="focus" state="focus">
      <ToggleGroup type="single" variant="outline">{@render items()}</ToggleGroup>
    </Specimen>
    <Specimen label="disabled">
      <ToggleGroup type="single" value="left" variant="outline" disabled>{@render items()}</ToggleGroup>
    </Specimen>
  </div>
</Story>
