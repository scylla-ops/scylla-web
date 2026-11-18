<script module lang="ts">
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { Widget, WidgetGrid, type WidgetSize } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const SIZES: WidgetSize[] = ['xs', 's', 'm', 'l'];

  const { Story } = defineMeta({ title: 'Widget/Widget', component: Widget });
</script>

<Story name="Sizes" asChild>
  <Specimen label="xs 2 × 1, s 2 × 2, m 4 × 2, l 4 × 4" class="w-full max-w-5xl">
    <WidgetGrid class="w-full">
      {#each SIZES as size (size)}
        <Widget {size} title="Title" meta="Meta" icon={GaugeIcon}>
          <p class="text-2xl leading-7 font-bold tabular-nums">89 %</p>
        </Widget>
      {/each}
    </WidgetGrid>
  </Specimen>
</Story>

<Story name="Header" asChild>
  <div class="grid max-w-xl gap-8">
    <Specimen label="title, meta and aside" class="w-full">
      <WidgetGrid class="w-full">
        <Widget size="m" title="Needs you" meta="open now" icon={InboxIcon}>
          {#snippet aside()}<span class="text-primary">2 new</span>{/snippet}
          <p class="text-sm text-muted-foreground">Content</p>
        </Widget>
      </WidgetGrid>
    </Specimen>
    <Specimen label="title only" class="w-full">
      <WidgetGrid class="w-full">
        <Widget size="m" title="Quick actions">
          <p class="text-sm text-muted-foreground">Content</p>
        </Widget>
      </WidgetGrid>
    </Specimen>
  </div>
</Story>
