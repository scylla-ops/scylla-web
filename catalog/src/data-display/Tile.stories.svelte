<script module lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { ColorGlyph, StatusShape, Tile, entityGlyph, type StatusState } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/Tile', component: Tile });

  const FOLDER = entityGlyph('folder')!;
  const HEALTH: { name: string; state: StatusState; color: string }[] = [
    { name: 'web', state: 'failed', color: 'chart-1' },
    { name: 'api', state: 'running', color: 'chart-2' },
    { name: 'docs', state: 'success', color: 'chart-3' },
    { name: 'cli', state: 'idle', color: 'chart-4' },
  ];
</script>

{#snippet actions()}
  <button type="button" class="flex size-8 items-center justify-center rounded-full hover:bg-accent">
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">Project menu</span>
  </button>
{/snippet}

<Story name="Health overview" asChild>
  <div class="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
    {#each HEALTH as item (item.name)}
      <Specimen label={item.state} class="items-stretch">
        <Tile title={item.name} {actions}>
          {#snippet icon()}<ColorGlyph icon={FOLDER} color={item.color} class="size-8" />{/snippet}
          {#snippet status()}<StatusShape state={item.state} label={item.state} size={16} />{/snippet}
        </Tile>
      </Specimen>
    {/each}
  </div>
</Story>

<Story name="States" asChild>
  <div class="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
    <Specimen label="no status" class="items-stretch">
      <Tile title="docs">
        {#snippet icon()}<ColorGlyph icon={FOLDER} class="size-8" />{/snippet}
      </Tile>
    </Specimen>
    <Specimen label="interactive, hovered" state="hover" class="items-stretch">
      <Tile title="web" interactive {actions}>
        {#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-1" class="size-8" />{/snippet}
      </Tile>
    </Specimen>
    <Specimen label="selected" class="items-stretch">
      <Tile title="web" selected>
        {#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-1" class="size-8" />{/snippet}
      </Tile>
    </Specimen>
    <Specimen label="long title" class="items-stretch">
      <Tile title="a project with a long name">
        {#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-5" class="size-8" />{/snippet}
      </Tile>
    </Specimen>
  </div>
</Story>
