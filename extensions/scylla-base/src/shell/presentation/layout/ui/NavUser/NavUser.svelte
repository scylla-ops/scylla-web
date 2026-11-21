<script lang="ts">
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import CookieIcon from '@lucide/svelte/icons/cookie';
  import LifeBuoyIcon from '@lucide/svelte/icons/life-buoy';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import ScaleIcon from '@lucide/svelte/icons/scale';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import { consentFrame, consentMessages, cookieSettings } from '@platform/consent';
  import { scyllaNavigate, workspaceUrl } from '@platform/context';
  import { legalLinks, legalMessages, legalQueries } from '@platform/legal';
  import { createQuery, routePathname } from '@scylla/core-sdk';
  import {
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
    getSidebar,
    SIDEBAR_FADE,
    SIDEBAR_MOTION,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { activeLocale, t, type SupportedLocale } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { signOut } from '@base/features/login';
  import { userQueries } from '@base/features/user';
  import { userName } from '@base/shared/presentation/presenters/user-identity.presenter.ts';
  // By path, not the barrel: this file is in the entry chunk, the other components are not.
  import IdentityAvatar from '@shared/presentation/ui/data-display/IdentityAvatar/IdentityAvatar.svelte';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { chooseLocale } from '@base/shell/presentation/layout/user-preferences.ts';
  import { linkParams } from '@base/shell/presentation/shell-params.ts';

  const LOCALES: readonly { locale: SupportedLocale; label: string }[] = [
    { locale: 'en', label: 'English' },
    { locale: 'fr', label: 'Français' },
  ];

  const sidebar = getSidebar();
  const meQuery = createQuery(() => userQueries.me());
  const legalQuery = createQuery(() => legalQueries.info());
  const legal = $derived(legalLinks(legalQuery.data));
  // The entry of the cookie settings: only while one tracker needs consent.
  const consent = consentFrame().on;

  const slug = $derived(linkParams().workspaceSlug);
  // The rail only: the sheet of a phone has no green row.
  const onAccount = $derived(
    !sidebar.isMobile &&
      !!slug &&
      ['account', 'help'].some(page => routePathname().startsWith(`${workspaceUrl(slug, page)}/`)),
  );
</script>

{#if meQuery.isLoading}
  <!-- The avatar and the name of the user. -->
  <div class="flex h-8 items-center gap-2 px-1" aria-busy="true">
    <Skeleton class="size-6 shrink-0 rounded-full" />
    <Skeleton class={cn('h-3.5 w-24', SIDEBAR_FADE)} />
  </div>
{:else}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class={cn(
            'flex h-8 w-full items-center gap-2 overflow-hidden rounded-lg px-1 text-left text-sm outline-hidden transition-[width,background-color,color] focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none group-data-[collapsible=icon]:w-8',
            SIDEBAR_MOTION,
            onAccount
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'hover:bg-accent data-[state=open]:bg-accent',
          )}
          aria-current={onAccount ? 'page' : undefined}
        >
          <!-- A failed read shows the menu all the same: signing out must stay possible. -->
          {#if meQuery.data}
            <IdentityAvatar
              profile={meQuery.data}
              size={24}
              class={cn(onAccount && 'bg-transparent text-sidebar-primary-foreground')}
            />
            <span class={cn('min-w-0 flex-1 truncate', SIDEBAR_FADE)}>
              {userName(meQuery.data, 'deleted')}
            </span>
          {:else}
            <span class="flex-1"></span>
          {/if}
          <ChevronsUpDownIcon
            class={cn(
              'ml-auto size-4 shrink-0',
              onAccount ? 'text-sidebar-primary-foreground' : 'text-muted-foreground',
              SIDEBAR_FADE,
            )}
          />
        </button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="min-w-56 rounded-lg border-border bg-popover shadow-lg"
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
      <DropdownMenuItem
        class="text-foreground hover:bg-accent"
        onSelect={() => scyllaNavigate.goToWorkspaceRoute('/help')}
      >
        <LifeBuoyIcon />
        {t(layoutMessages.helpAndTours)}
      </DropdownMenuItem>
      <!-- The documents that the operator turned on, in a new tab: the app stays open. -->
      {#if legal.length > 0}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger class="text-foreground">
            <ScaleIcon />
            {t(legalMessages.legalAndPrivacy)}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="min-w-48 rounded-lg border-border bg-popover shadow-lg">
            {#each legal as link (link.kind)}
              <DropdownMenuItem class="text-foreground hover:bg-accent">
                {#snippet child({ props })}
                  <a {...props} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                {/snippet}
              </DropdownMenuItem>
            {/each}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      {/if}
      {#if consent}
        <DropdownMenuItem
          class="text-foreground hover:bg-accent"
          onSelect={() => cookieSettings.open('preferences')}
        >
          <CookieIcon />
          {t(consentMessages.cookieSettings)}
        </DropdownMenuItem>
      {/if}
      <DropdownMenuSeparator />
      <DropdownMenuLabel class="px-2 py-1 text-xs font-normal text-muted-foreground">
        {t(layoutMessages.language)}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={activeLocale()}
        onValueChange={value => void chooseLocale(value as SupportedLocale)}
      >
        {#each LOCALES as option (option.locale)}
          <DropdownMenuRadioItem value={option.locale}>{option.label}</DropdownMenuRadioItem>
        {/each}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-foreground hover:bg-accent" onSelect={signOut}>
        <LogOutIcon />
        {t(layoutMessages.signOut)}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
