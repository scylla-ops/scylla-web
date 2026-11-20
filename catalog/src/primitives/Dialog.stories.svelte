<script module lang="ts">
  import {
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
    Input,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/Dialog',
    component: Dialog,
    // `DialogContent` puts itself in a `DialogPortal`, over a `DialogOverlay`.
    subcomponents: {
      DialogTrigger,
      DialogPortal,
      DialogOverlay,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
      DialogClose,
    },
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Open" asChild>
  <Dialog open>
    <DialogTrigger>
      {#snippet child({ props })}<Button {...props}>Open</Button>{/snippet}
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename the pipeline</DialogTitle>
        <DialogDescription>The id of the pipeline does not change.</DialogDescription>
      </DialogHeader>
      <Input value="build" aria-label="Name" />
      <DialogFooter>
        <DialogClose>
          {#snippet child({ props })}<Button variant="outline" {...props}>Cancel</Button>{/snippet}
        </DialogClose>
        <Button>Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Closed" asChild>
  <div class="p-4">
    <Dialog>
      <DialogTrigger>
        {#snippet child({ props })}<Button {...props}>Open the dialog</Button>{/snippet}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename the pipeline</DialogTitle>
          <DialogDescription>The id of the pipeline does not change.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  </div>
</Story>
