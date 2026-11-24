<script module lang="ts">
  import { Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const PERIODS = ['daily', 'weekly', 'monthly'];

  const { Story } = defineMeta({
    title: 'Primitives/RadioGroup',
    component: RadioGroup,
    subcomponents: { RadioGroupItem },
  });
</script>

<Story name="Group" asChild>
  <RadioGroup value="weekly">
    {#each PERIODS as period (period)}
      <div class="flex items-center gap-2">
        <RadioGroupItem value={period} id="period-{period}" />
        <Label for="period-{period}">{period}</Label>
      </div>
    {/each}
    <div class="flex items-center gap-2">
      <RadioGroupItem value="yearly" id="period-yearly" disabled />
      <Label for="period-yearly">yearly</Label>
    </div>
  </RadioGroup>
</Story>

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="unchecked">
      <RadioGroup><RadioGroupItem value="a" aria-label="A" /></RadioGroup>
    </Specimen>
    <Specimen label="checked">
      <RadioGroup value="a"><RadioGroupItem value="a" aria-label="A" /></RadioGroup>
    </Specimen>
    <Specimen label="focus" state="focus">
      <RadioGroup><RadioGroupItem value="a" aria-label="A" /></RadioGroup>
    </Specimen>
    <Specimen label="disabled">
      <RadioGroup><RadioGroupItem value="a" aria-label="A" disabled /></RadioGroup>
    </Specimen>
    <Specimen label="invalid">
      <RadioGroup><RadioGroupItem value="a" aria-label="A" aria-invalid="true" /></RadioGroup>
    </Specimen>
  </div>
</Story>
