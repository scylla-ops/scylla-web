<script module lang="ts">
  import { StableLabel } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Controls/StableLabel',
    component: StableLabel,
    args: { text: 'Save', reserve: ['Save', 'Saving...'], busy: false },
  });
</script>

<Story name="Playground" asChild>
  <div class="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button><StableLabel text="Save" reserve={['Save', 'Saving...']} /></Button>
  </div>
</Story>

<Story name="States" asChild>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end gap-8">
      <Specimen label="idle">
        <div class="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button><StableLabel text="Save" reserve={['Save', 'Saving...']} /></Button>
        </div>
      </Specimen>
      <Specimen label="pending: same width">
        <div class="flex justify-end gap-2">
          <Button variant="outline" disabled>Cancel</Button>
          <Button disabled><StableLabel text="Saving..." reserve={['Save', 'Saving...']} /></Button>
        </div>
      </Specimen>
      <Specimen label="busy: a spinner in place of the label">
        <Button disabled aria-busy="true"><StableLabel text="Create" busy /></Button>
      </Specimen>
    </div>
    <div class="flex flex-wrap items-end gap-8">
      <Specimen label="open">
        <Button class="border border-transparent">
          <StableLabel text="Close feedback" reserve={['Close feedback', 'Reopen']} />
        </Button>
      </Specimen>
      <Specimen label="closed: same width">
        <Button variant="outline">
          <StableLabel text="Reopen" reserve={['Close feedback', 'Reopen']} />
        </Button>
      </Specimen>
    </div>
  </div>
</Story>
