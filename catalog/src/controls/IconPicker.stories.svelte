<script module lang="ts">
  import { IconPicker, type IconChoice } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/IconPicker', component: IconPicker });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#4338CA'];
</script>

<script lang="ts">
  let glyph = $state<IconChoice>({ kind: 'glyph', name: 'rocket', color: '#E879F9' });
  let fallback = $state<IconChoice>({ kind: 'default' });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="glyph in a free color" class="w-[464px]">
      <IconPicker
        class="w-full"
        value={glyph}
        onchange={choice => (glyph = choice)}
        title="staging"
        subtitle="scylla-ops/scylla-ee"
        recent={RECENT}
      />
    </Specimen>
    <Specimen label="default icon" class="w-[464px]">
      <IconPicker class="w-full" value={fallback} onchange={choice => (fallback = choice)} title="docs" />
    </Specimen>
  </div>
</Story>
