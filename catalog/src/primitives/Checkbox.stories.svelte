<script module lang="ts">
  import { Checkbox, Label } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Primitives/Checkbox', component: Checkbox });
</script>

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="unchecked"><Checkbox aria-label="Unchecked" /></Specimen>
    <Specimen label="checked"><Checkbox checked aria-label="Checked" /></Specimen>
    <Specimen label="indeterminate"><Checkbox indeterminate aria-label="Some" /></Specimen>
    <Specimen label="focus" state="focus"><Checkbox aria-label="Focused" /></Specimen>
    <Specimen label="disabled"><Checkbox disabled aria-label="Disabled" /></Specimen>
    <Specimen label="checked, disabled">
      <Checkbox checked disabled aria-label="Checked and disabled" />
    </Specimen>
    <Specimen label="invalid"><Checkbox aria-invalid="true" aria-label="Invalid" /></Specimen>
  </div>
</Story>

<Story name="With a label" asChild>
  <div class="flex items-center gap-2">
    <Checkbox id="terms" />
    <Label for="terms">I accept the terms</Label>
  </div>
</Story>
