<script module lang="ts">
  import { FormItemType, IconField, ScyllaForm, type FormItem, type IconChoice } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/IconField', component: IconField });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#4338CA'];

  const PROJECT: readonly FormItem<'name' | 'description'>[] = [
    {
      id: 'name',
      type: FormItemType.Input,
      inputType: 'text',
      label: 'Project name',
      defaultValue: 'web',
    },
    {
      id: 'description',
      type: FormItemType.Input,
      inputType: 'text',
      label: 'Description',
      defaultValue: 'The web app',
      optional: true,
    },
  ];
</script>

<script lang="ts">
  let glyph = $state<IconChoice>({ kind: 'glyph', name: 'rocket', color: '#E879F9' });
  let fallback = $state<IconChoice>({ kind: 'default' });
  let agent = $state<IconChoice>({ kind: 'default' });
  let project = $state<IconChoice>({ kind: 'glyph', name: 'rocket', color: 'chart-2' });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="glyph in a free color" class="w-[464px]">
      <IconField value={glyph} onchange={choice => (glyph = choice)} recent={RECENT} />
    </Specimen>
    <Specimen label="default icon" class="w-[464px]">
      <IconField value={fallback} onchange={choice => (fallback = choice)} />
    </Specimen>
    <Specimen label="default icon of an agent" class="w-[464px]">
      <IconField
        value={agent}
        onchange={choice => (agent = choice)}
        defaultGlyph="bot"
        defaultColor="info"
      />
    </Specimen>
    <Specimen label="disabled" class="w-[464px]">
      <IconField value={glyph} onchange={() => {}} disabled />
    </Specimen>
  </div>
</Story>

<!-- The field in the `leading` snippet of a form, as in « Edit » of a project. -->
<Story name="In a form" asChild>
  <Specimen label="edit a project" class="w-full max-w-[464px]">
    <div class="w-full">
      <ScyllaForm
        items={PROJECT}
        onSubmit={() => {}}
        buttonLabel="Save"
        autofocus={false}
        class="w-full"
      >
        {#snippet leading()}
          <IconField value={project} onchange={choice => (project = choice)} recent={RECENT} />
        {/snippet}
      </ScyllaForm>
    </div>
  </Specimen>
</Story>
