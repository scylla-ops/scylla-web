<script module lang="ts">
  import { IconPicker, ScyllaDialog, type IconChoice } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/IconPicker', component: IconPicker });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#4338CA'];
</script>

<script lang="ts">
  let glyph = $state<IconChoice>({ kind: 'glyph', name: 'rocket', color: '#E879F9' });
  let fallback = $state<IconChoice>({ kind: 'default' });
  let project = $state<IconChoice>({ kind: 'glyph', name: 'rocket', color: 'chart-2' });
  let open = $state(true);
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

<!-- As « Icon » of a project: a stable dialog keeps one size on each tab, and the drop zone of the
     Image tab fills the body. -->
<Story name="In a stable dialog" asChild>
  <div class="p-4"><Button variant="outline" onclick={() => (open = true)}>Open again</Button></div>
  <ScyllaDialog
    {open}
    onOpenChange={next => (open = next)}
    title="Project icon"
    description="Choose a glyph and a color, or an image."
    stable={37}
    class="sm:max-w-lg"
  >
    <IconPicker value={project} onchange={choice => (project = choice)} title="web" recent={RECENT} />
    <DialogFooter>
      <Button variant="outline" data-dialog-dismiss onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={() => (open = false)}>Save</Button>
    </DialogFooter>
  </ScyllaDialog>
</Story>
