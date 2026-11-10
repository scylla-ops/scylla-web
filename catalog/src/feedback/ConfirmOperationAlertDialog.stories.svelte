<script module lang="ts">
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Feedback/ConfirmOperationAlertDialog',
    component: ConfirmOperationAlertDialog,
    parameters: { layout: 'fullscreen' },
  });
</script>

<script lang="ts">
  let open = $state(true);
</script>

{#snippet reopen()}
  <div class="p-4"><Button variant="outline" onclick={() => (open = true)}>Open again</Button></div>
{/snippet}

<Story name="Destructive" asChild>
  {@render reopen()}
  <ConfirmOperationAlertDialog
    {open}
    onOpenChange={next => (open = next)}
    onContinue={() => (open = false)}
    title="Delete the pipeline?"
    description="Its runs and its logs go too. You cannot undo this."
    continueLabel="Delete"
  />
</Story>

<Story name="Default" asChild>
  {@render reopen()}
  <ConfirmOperationAlertDialog
    {open}
    onOpenChange={next => (open = next)}
    onContinue={() => (open = false)}
    title="Reactivate the user?"
    description="The user can sign in again."
    continueLabel="Reactivate"
    variant="default"
  />
</Story>

<Story name="Loading" asChild>
  <ConfirmOperationAlertDialog
    open
    onOpenChange={() => {}}
    onContinue={() => {}}
    title="Delete the pipeline?"
    continueLabel="Delete"
    isLoading
  />
</Story>

<Story name="Default texts" asChild>
  <ConfirmOperationAlertDialog open onOpenChange={() => {}} onContinue={() => {}} />
</Story>
