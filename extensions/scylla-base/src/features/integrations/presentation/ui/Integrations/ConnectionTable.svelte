<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import WebhookIcon from '@lucide/svelte/icons/webhook';
  import { DataTable } from '@scylla/ui';
  import { Button, buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
  import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import {
    connectionSubtitle,
    eventsLabel,
    repairActionOf,
    repositoriesLabel,
    stateReasonText,
    tokenExpiryText,
  } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import ConnectionMenu from './ConnectionMenu.svelte';
  import ConnectionStateChip from './ConnectionStateChip.svelte';
  import { connectionColumns } from './connection-table.columns.ts';

  interface Props {
    connections: VcsConnectionEntity[];
    canManage: boolean;
    onInstallAgain: () => void;
    onReplaceToken: (connection: VcsConnectionEntity) => void;
    onDisconnect: (connection: VcsConnectionEntity) => void;
  }

  let { connections, canManage, onInstallAgain, onReplaceToken, onDisconnect }: Props = $props();

  const now = Date.now();

  const columns = $derived(
    connectionColumns({ account, repositories, events, state: stateCell, actions }),
  );
</script>

{#snippet account(connection: VcsConnectionEntity)}
  <div class="flex min-w-0 items-center gap-3">
    <ProviderTile provider={connection.provider} />
    <div class="flex min-w-0 flex-col">
      <span class="truncate text-sm font-medium">{connection.account}</span>
      <span class="text-xs whitespace-normal text-muted-foreground">
        {connectionSubtitle(connection)}
      </span>
    </div>
  </div>
{/snippet}

{#snippet repositories(connection: VcsConnectionEntity)}
  <span class="text-sm">{repositoriesLabel(connection)}</span>
{/snippet}

{#snippet events(connection: VcsConnectionEntity)}
  <span class="inline-flex items-center gap-1.5 text-sm">
    {#if connection.deliveryMode === 'polling'}
      <RefreshCwIcon class="size-4 text-info" aria-hidden="true" />
    {:else}
      <WebhookIcon class="size-4 text-muted-foreground" aria-hidden="true" />
    {/if}
    {eventsLabel(connection)}
  </span>
{/snippet}

{#snippet stateCell(connection: VcsConnectionEntity)}
  {@const reason = stateReasonText(connection)}
  {@const expiry = tokenExpiryText(connection, now)}
  {@const repair = canManage ? repairActionOf(connection, now) : null}
  <div class="flex flex-col items-start gap-1.5 py-1 whitespace-normal">
    <ConnectionStateChip state={connection.state} />
    {#if reason}
      <p
        class={connection.state === 'disconnected'
          ? 'text-xs text-destructive'
          : 'text-xs text-muted-foreground'}
      >
        {reason}
      </p>
    {/if}
    {#if expiry}
      <p class="text-xs text-muted-foreground">{expiry}</p>
    {/if}
    {#if repair === 'install_again'}
      <Button size="sm" variant="outline" class="h-7" onclick={onInstallAgain}>
        <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
        {t(messages.installAgain)}
      </Button>
    {:else if repair === 'configure'}
      <a
        class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7')}
        href={connection.settingsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
        {t(messages.configureOnGitHub)}
      </a>
    {:else if repair === 'replace_token'}
      <Button size="sm" variant="outline" class="h-7" onclick={() => onReplaceToken(connection)}>
        <KeyRoundIcon class="size-3.5" aria-hidden="true" />
        {t(messages.replaceToken)}
      </Button>
    {/if}
  </div>
{/snippet}

{#snippet actions(connection: VcsConnectionEntity)}
  <ConnectionMenu
    {connection}
    onReplaceToken={canManage ? () => onReplaceToken(connection) : undefined}
    onDisconnect={canManage ? () => onDisconnect(connection) : undefined}
  />
{/snippet}

<DataTable {columns} data={connections} getRowId={connection => connection.id} alignRowsCenter />
