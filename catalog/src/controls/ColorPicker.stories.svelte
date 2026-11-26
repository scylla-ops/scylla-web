<script module lang="ts">
  import { ColorPicker } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/ColorPicker', component: ColorPicker });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#A3E635', '#4338CA', '#F43F5E'];
</script>

<script lang="ts">
  let rose = $state('#E879F9');
  let indigo = $state('#4338CA');
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="rose: enough contrast in dark ({rose})">
      <div class="bg-popover rounded-xl border p-3 shadow-lg">
        <ColorPicker value="#E879F9" onchange={hex => (rose = hex)} recent={RECENT} />
      </div>
    </Specimen>
    <Specimen label="indigo: low contrast in dark ({indigo})">
      <div class="bg-popover rounded-xl border p-3 shadow-lg">
        <ColorPicker value="#4338CA" onchange={hex => (indigo = hex)} recent={RECENT} />
      </div>
    </Specimen>
    <Specimen label="no recent color, no contrast lines">
      <div class="bg-popover rounded-xl border p-3 shadow-lg">
        <ColorPicker value="#22D3EE" onchange={() => {}} contrast={false} />
      </div>
    </Specimen>
  </div>
</Story>
