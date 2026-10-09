<script lang="ts">
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import { scyllaNavigate } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    getSidebar,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
  } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { signOut } from '@base/features/login';
  import { userQueries } from '@base/features/user';
  // By path, not the barrel: this file is in the entry chunk, the other components are not.
  import UserIdentity from '@shared/presentation/ui/data-display/UserIdentity/UserIdentity.svelte';
  import { layoutMessages } from '../layout.messages.ts';

  const sidebar = getSidebar();
  const meQuery = createQuery(() => userQueries.me());
</script>

{#if meQuery.isLoading}
  <div>{t(layoutMessages.loading)}</div>
{:else}
  <SidebarMenu>
    <SidebarMenuItem
      class="rounded-lg border border-border bg-background shadow-sm transition-all duration-200 hover:scale-105 hover:border-primary/40 hover:bg-accent hover:shadow-md focus:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:scale-105 data-[state=open]:border-primary data-[state=open]:bg-accent"
    >
      <DropdownMenu>
        <DropdownMenuTrigger>
          {#snippet child({ props })}
            <SidebarMenuButton
              {...props}
              size="lg"
              class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <!-- A failed read shows the menu all the same: signing out must stay possible. -->
              {#if meQuery.data}
                <UserIdentity user={meQuery.data} size="sm" class="flex-1" />
              {:else}
                <span class="flex-1"></span>
              {/if}
              <ChevronsUpDownIcon class="ml-auto size-4" />
            </SidebarMenuButton>
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg border-border bg-background shadow-lg"
          side={sidebar.isMobile ? 'bottom' : 'right'}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuItem
            class="text-foreground hover:bg-accent"
            onSelect={scyllaNavigate.goToAccount}
          >
            <UserRoundIcon />
            {t(layoutMessages.account)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-foreground hover:bg-accent" onSelect={signOut}>
            <LogOutIcon />
            {t(layoutMessages.signOut)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
{/if}
