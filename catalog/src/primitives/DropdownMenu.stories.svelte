<script module lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/DropdownMenu',
    component: DropdownMenu,
    subcomponents: {
      DropdownMenuTrigger,
      DropdownMenuContent,
      DropdownMenuLabel,
      DropdownMenuItem,
      DropdownMenuSeparator,
      DropdownMenuRadioGroup,
      DropdownMenuRadioItem,
      DropdownMenuSub,
      DropdownMenuSubTrigger,
      DropdownMenuSubContent,
    },
  });
</script>

<Story name="Actions, destructive last" asChild>
  <div class="h-64">
    <DropdownMenu open>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <Button variant="ghost" size="icon" aria-label="Actions" {...props}><EllipsisIcon /></Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-48">
        <DropdownMenuLabel>Pipeline</DropdownMenuLabel>
        <DropdownMenuItem><PencilIcon />Rename</DropdownMenuItem>
        <DropdownMenuItem inset>Duplicate</DropdownMenuItem>
        <DropdownMenuItem disabled>Export</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive"><TrashIcon />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</Story>

<Story name="Radio items" asChild>
  <div class="h-48">
    <DropdownMenu open>
      <DropdownMenuTrigger>
        {#snippet child({ props })}<Button variant="outline" {...props}>Theme</Button>{/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-40">
        <DropdownMenuRadioGroup value="dark">
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</Story>

<Story name="Submenu" asChild>
  <div class="h-56">
    <DropdownMenu open>
      <DropdownMenuTrigger>
        {#snippet child({ props })}<Button variant="outline" {...props}>Account</Button>{/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-48">
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuSub open>
          <DropdownMenuSubTrigger><FileTextIcon />Documents</DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="w-40">
            <DropdownMenuItem>Privacy policy</DropdownMenuItem>
            <DropdownMenuItem>Terms of service</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</Story>
