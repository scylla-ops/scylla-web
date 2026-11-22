<!-- Shaped after the user menu of the shell: a menu with a submenu of links. -->
<script lang="ts">
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from '../index.ts';
</script>

<DropdownMenu>
  <DropdownMenuTrigger>Account</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Documents</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem>Privacy policy</DropdownMenuItem>
        <DropdownMenuItem>Terms of service</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  </DropdownMenuContent>
</DropdownMenu>
