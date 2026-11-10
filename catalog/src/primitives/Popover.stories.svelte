<script module lang="ts">
  import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/Popover',
    component: Popover,
    subcomponents: { PopoverTrigger, PopoverContent },
  });
</script>

<Story name="Open" asChild>
  <div class="h-56">
    <Popover open>
      <PopoverTrigger>
        {#snippet child({ props })}<Button variant="outline" {...props}>Rename</Button>{/snippet}
      </PopoverTrigger>
      <PopoverContent align="start">
        <div class="grid gap-2">
          <Label for="popover-name">Name</Label>
          <Input id="popover-name" value="build" />
          <Button size="sm" class="justify-self-end">Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</Story>
