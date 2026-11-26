<script module lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { Badge } from '@scylla/ui/primitives';
  import { ColorGlyph, ListRow, StatusShape, entityGlyph } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/ListRow', component: ListRow });

  const FOLDER = entityGlyph('folder')!;
</script>

{#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-2" class="size-6" />{/snippet}
{#snippet badge()}<Badge variant="destructive">1 failed</Badge>{/snippet}
{#snippet subtitle()}acme/api{/snippet}
{#snippet meta()}
  <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
    <StatusShape state="success" label="Success" size={16} />
    build, 4 min ago
  </span>
{/snippet}
{#snippet actions()}
  <button type="button" class="flex size-8 items-center justify-center rounded-full hover:bg-accent">
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">Project menu</span>
  </button>
{/snippet}

<Story name="Desktop" asChild>
  <div class="flex w-full max-w-3xl flex-col gap-6">
    <Specimen label="title and icon" class="items-stretch">
      <ListRow title="docs" {icon} />
    </Specimen>
    <Specimen label="all the parts" class="items-stretch">
      <ListRow title="api" {icon} {badge} {subtitle} {meta} {actions} />
    </Specimen>
    <Specimen label="interactive, hovered" state="hover" class="items-stretch">
      <ListRow title="api" interactive {icon} {meta} {actions} />
    </Specimen>
    <Specimen label="selected" class="items-stretch">
      <ListRow title="api" selected {icon} {meta} {actions} />
    </Specimen>
  </div>
</Story>

<Story name="Phone" asChild>
  <div class="flex w-[375px] flex-col gap-6">
    <Specimen label="stacked: the details on a second line" class="items-stretch">
      <ListRow title="api" stacked {icon} {badge} {subtitle} {meta} {actions} />
    </Specimen>
    <Specimen label="stacked, long title" class="items-stretch">
      <ListRow title="a project with a very long name" stacked {icon} {meta} {actions} />
    </Specimen>
  </div>
</Story>
