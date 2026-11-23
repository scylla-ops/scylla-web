<script module lang="ts">
  import {
    Button,
    Dialog,
    DialogDescription,
    DialogTitle,
    SheetContent,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/Sheet',
    component: SheetContent,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Right" asChild>
  <Dialog open>
    <SheetContent side="right" class="p-5">
      <DialogTitle>Success rate</DialogTitle>
      <DialogDescription>Ratio · Small · 2 × 2</DialogDescription>
      <Button class="mt-auto">Apply</Button>
    </SheetContent>
  </Dialog>
</Story>

<Story name="Light overlay" asChild>
  <Dialog open>
    <SheetContent side="right" overlayClass="bg-overlay/25" class="p-5">
      <DialogTitle>Success rate</DialogTitle>
      <DialogDescription>The page stays readable behind the sheet.</DialogDescription>
    </SheetContent>
  </Dialog>
</Story>
