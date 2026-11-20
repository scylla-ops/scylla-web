<script module lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Badge, Button, DialogFooter, Input } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Feedback/ScyllaDialog',
    component: ScyllaDialog,
    parameters: { layout: 'fullscreen' },
  });
</script>

<script lang="ts">
  let open = $state(true);
</script>

{#snippet reopen()}
  <div class="p-4"><Button variant="outline" onclick={() => (open = true)}>Open again</Button></div>
{/snippet}

{#snippet form()}
  <Input aria-label="Email" placeholder="ada@example.com" />
  <DialogFooter>
    <Button variant="outline" data-dialog-dismiss onclick={() => (open = false)}>Cancel</Button>
    <Button onclick={() => (open = false)}>Invite</Button>
  </DialogFooter>
{/snippet}

{#snippet header()}
  <div class="flex items-center gap-2">
    <h2 class="text-lg">Invite a member</h2>
    <Badge variant="secondary">Beta</Badge>
  </div>
{/snippet}

<Story name="Dismissible" asChild>
  {@render reopen()}
  <ScyllaDialog
    {open}
    onOpenChange={next => (open = next)}
    title="Invite a member"
    description="We send an email with a link."
  >
    {@render form()}
  </ScyllaDialog>
</Story>

<Story name="Close button only" asChild>
  {@render reopen()}
  <ScyllaDialog {open} onOpenChange={next => (open = next)} title="Invite a member" dismissible="button">
    {@render form()}
  </ScyllaDialog>
</Story>

<Story name="Not dismissible" asChild>
  {@render reopen()}
  <ScyllaDialog {open} onOpenChange={next => (open = next)} title="Invite a member" dismissible={false}>
    {@render form()}
  </ScyllaDialog>
</Story>

<Story name="Custom header" asChild>
  {@render reopen()}
  <ScyllaDialog {open} onOpenChange={next => (open = next)} {header}>
    {@render form()}
  </ScyllaDialog>
</Story>
