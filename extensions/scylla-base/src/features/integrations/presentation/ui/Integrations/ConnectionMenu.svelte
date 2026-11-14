<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
  import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';

  interface Props {
    connection: VcsConnectionEntity;
    /** Absent: the user may not change the connections. */
    onReplaceToken?: () => void;
    onDisconnect?: () => void;
  }

  let { connection, onReplaceToken, onDisconnect }: Props = $props();

  const github = $derived(connection.provider === 'github');
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 rounded-full')}
  >
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">{t(messages.actions(connection.account))}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-52">
    {#if connection.settingsUrl}
      <DropdownMenuItem>
        {#snippet child({ props })}
          <a {...props} href={connection.settingsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="size-4" aria-hidden="true" />
            {t(github ? messages.configureOnGitHub : messages.openOnGitLab)}
          </a>
        {/snippet}
      </DropdownMenuItem>
    {/if}
    {#if !github && onReplaceToken}
      <DropdownMenuItem onSelect={onReplaceToken}>
        <KeyRoundIcon class="size-4" aria-hidden="true" />
        {t(messages.replaceToken)}
      </DropdownMenuItem>
    {/if}
    {#if onDisconnect}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onDisconnect}>
        <UnplugIcon class="size-4" aria-hidden="true" />
        {t(messages.disconnect)}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
