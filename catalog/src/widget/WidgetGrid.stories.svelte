<script module lang="ts">
  import { Widget, WidgetGrid, type WidgetSize } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const LAYOUT: { id: string; size: WidgetSize }[] = [
    { id: 'right-now', size: 'xs' },
    { id: 'capacity', size: 'xs' },
    { id: 'webhooks', size: 'xs' },
    { id: 'run-minutes', size: 'xs' },
    { id: 'needs-you', size: 'l' },
    { id: 'success-rate', size: 'm' },
    { id: 'run-duration', size: 'm' },
  ];

  const { Story } = defineMeta({ title: 'Widget/WidgetGrid', component: WidgetGrid });
</script>

{#snippet layout()}
  <WidgetGrid class="w-full">
    {#each LAYOUT as widget (widget.id)}
      <Widget size={widget.size} title={widget.id}>
        <p class="text-xs text-muted-foreground">{widget.size}</p>
      </Widget>
    {/each}
  </WidgetGrid>
{/snippet}

<Story name="Layouts" asChild>
  <div class="grid gap-10">
    <Specimen label="wide: 8 columns, rows of 98 px, gap 16 px" class="w-[1120px]">
      {@render layout()}
    </Specimen>
    <Specimen label="narrow: 2 columns, rows of 80 px, gap 12 px" class="w-[358px]">
      {@render layout()}
    </Specimen>
  </div>
</Story>
