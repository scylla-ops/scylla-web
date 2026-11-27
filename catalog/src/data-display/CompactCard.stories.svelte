<script module lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { Badge } from '@scylla/ui/primitives';
  import { ColorGlyph, CompactCard, StatusShape, entityGlyph } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/CompactCard', component: CompactCard });

  const FOLDER = entityGlyph('folder')!;
</script>

{#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-3" class="size-7" />{/snippet}
{#snippet badge()}<Badge variant="destructive">2 failed</Badge>{/snippet}
{#snippet subtitle()}acme/web{/snippet}
{#snippet actions()}
  <button type="button" class="flex size-8 items-center justify-center rounded-full hover:bg-accent">
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">Project menu</span>
  </button>
{/snippet}
{#snippet footer()}
  <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
    <StatusShape state="running" label="Running" size={16} />
    deploy runs, 2 min
  </span>
{/snippet}

<Story name="Parts" asChild>
  <div class="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <Specimen label="title and icon" class="items-stretch">
      <CompactCard title="docs" {icon} />
    </Specimen>
    <Specimen label="badge, subtitle, actions, footer" class="items-stretch">
      <CompactCard title="web" {icon} {badge} {subtitle} {actions} {footer} />
    </Specimen>
    <Specimen label="long title" class="items-stretch">
      <CompactCard title="a project with a very long name that does not fit" {icon} {actions} />
    </Specimen>
  </div>
</Story>

<Story name="States" asChild>
  <div class="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
    <Specimen label="interactive, hovered" state="hover" class="items-stretch">
      <CompactCard title="web" interactive {icon} {footer} />
    </Specimen>
    <Specimen label="selected" class="items-stretch">
      <CompactCard title="web" selected {icon} {footer} />
    </Specimen>
    <Specimen label="focused" state="focus" class="items-stretch">
      <CompactCard title="web" interactive tabindex={0} {icon} {footer} />
    </Specimen>
  </div>
</Story>
