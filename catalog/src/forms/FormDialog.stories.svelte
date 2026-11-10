<script module lang="ts">
  import { FormDialog, FormItemType, type FormItem } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const ITEMS: readonly FormItem<'name' | 'description'>[] = [
    { id: 'name', type: FormItemType.Input, inputType: 'text', label: 'Name', placeholder: 'build' },
    {
      id: 'description',
      type: FormItemType.Input,
      inputType: 'text',
      label: 'Description',
      optional: true,
    },
  ];

  const { Story } = defineMeta({
    title: 'Forms/FormDialog',
    component: FormDialog,
    parameters: { layout: 'fullscreen' },
  });
</script>

<script lang="ts">
  let open = $state(true);
</script>

{#snippet reopen()}
  <div class="p-4"><Button variant="outline" onclick={() => (open = true)}>Open again</Button></div>
{/snippet}

<Story name="Open" asChild>
  {@render reopen()}
  <FormDialog
    {open}
    onOpenChange={next => (open = next)}
    title="New pipeline"
    description="You can change the name later."
    items={ITEMS}
    submitLabel="Create"
    onSubmit={() => (open = false)}
  />
</Story>

<Story name="Pending" asChild>
  <FormDialog
    open
    onOpenChange={() => {}}
    title="New pipeline"
    items={ITEMS}
    isPending
    submitLabel="Create"
    pendingLabel="Creating…"
    onSubmit={() => {}}
  />
</Story>

<Story name="No cancel" asChild>
  <FormDialog
    open
    onOpenChange={() => {}}
    title="Name your workspace"
    items={ITEMS}
    hideCancel
    onSubmit={() => {}}
  />
</Story>
