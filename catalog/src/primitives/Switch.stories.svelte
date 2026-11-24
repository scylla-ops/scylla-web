<script module lang="ts">
  import { Label, Switch } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Primitives/Switch', component: Switch });
</script>

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="off"><Switch aria-label="Off" /></Specimen>
    <Specimen label="on"><Switch checked aria-label="On" /></Specimen>
    <Specimen label="focus" state="focus"><Switch aria-label="Focused" /></Specimen>
    <Specimen label="disabled"><Switch disabled aria-label="Disabled" /></Specimen>
    <Specimen label="on, disabled"><Switch checked disabled aria-label="On and disabled" /></Specimen>
  </div>
</Story>

<Story name="With a label" asChild>
  <div class="flex items-center gap-2">
    <Switch id="auto" checked />
    <Label for="auto">Run on each push</Label>
  </div>
</Story>
