<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import PlugIcon from '@lucide/svelte/icons/plug';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import { scyllaNavigate } from '@platform/context';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
  import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import {
    repairActionOf,
    repositoriesLabel,
    stateReasonText,
  } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';
  import ConnectGitHubDialog from '../ConnectGitHubDialog/ConnectGitHubDialog.svelte';
  import ConnectGitLabDialog from '../ConnectGitLabDialog/ConnectGitLabDialog.svelte';
  import ConnectionTable from './ConnectionTable.svelte';
  import PageBanner from './PageBanner.svelte';
  import ProviderCards from './ProviderCards.svelte';
  import { createIntegrationsPage } from './integrations-page.state.svelte.ts';

  const page = createIntegrationsPage();

  const connect = (provider: VcsProvider) => page.open({ kind: provider });
  const closeDialog = (open: boolean) => {
    if (!open) page.close();
  };

  const dialog = $derived(page.dialog);
  const disconnecting = $derived(dialog?.kind === 'disconnect' ? dialog.connection : null);
  const gitLabTarget = $derived(
    dialog?.kind === 'replace-token'
      ? { workspaceId: page.workspaceId, connection: dialog.connection }
      : { workspaceId: page.workspaceId },
  );
</script>

<div class="mx-auto flex w-full max-w-4xl shrink-0 flex-col gap-6 pb-20">
  <div>
    <h1>{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  {#if page.justConnected}
    {@const connection = page.justConnected}
    <PageBanner
      icon={CircleCheckIcon}
      tone="success"
      title={t(messages.connectedTo(connection.account, repositoriesLabel(connection)))}
      body={t(messages.nextStep)}
    >
      {#snippet actions()}
        <Button size="sm" variant="ghost" onclick={page.dismissConnected}>
          {t(messages.dismiss)}
        </Button>
        <Button size="sm" onclick={() => scyllaNavigate.goToWorkspaceRoute('/projects')}>
          {t(messages.openProjects)}
        </Button>
      {/snippet}
    </PageBanner>
  {:else if page.broken}
    {@const connection = page.broken}
    {@const repair = page.canManage ? repairActionOf(connection, Date.now()) : null}
    <PageBanner
      icon={UnplugIcon}
      tone="destructive"
      title={stateReasonText(connection)}
      body={t(messages.stoppedFor(connection.projectCount))}
    >
      {#snippet actions()}
        {#if repair === 'install_again'}
          <Button size="sm" onclick={() => connect('github')}>{t(messages.installAgain)}</Button>
        {:else if repair === 'replace_token'}
          <Button size="sm" onclick={() => page.open({ kind: 'replace-token', connection })}>
            {t(messages.replaceToken)}
          </Button>
        {/if}
      {/snippet}
    </PageBanner>
  {/if}

  <ProviderCards {page} onConnect={connect} />

  <section class="flex flex-col gap-3" aria-labelledby="integrations-connections">
    <h2 id="integrations-connections" class="text-sm">{t(messages.connections)}</h2>
    {#if page.connections.isError && !page.connections.data}
      <ErrorState message={page.connections.error?.message} />
    {:else if page.connections.isPending}
      <ListSkeleton rows={2} rowClass="h-16 w-full rounded-xl" />
    {:else if page.all.length === 0}
      <div
        class="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
      >
        <span
          class="flex size-12 items-center justify-center rounded-full bg-muted text-primary"
          aria-hidden="true"
        >
          <PlugIcon class="size-5" />
        </span>
        <h3 class="text-xl">{t(messages.emptyTitle)}</h3>
        <p class="max-w-md text-sm text-muted-foreground">{t(messages.emptyBody)}</p>
      </div>
    {:else}
      <ConnectionTable
        connections={page.all}
        canManage={page.canManage}
        onInstallAgain={() => connect('github')}
        onReplaceToken={connection => page.open({ kind: 'replace-token', connection })}
        onDisconnect={connection => page.open({ kind: 'disconnect', connection })}
      />
    {/if}
  </section>
</div>

<ConnectGitHubDialog
  open={dialog?.kind === 'github'}
  onOpenChange={closeDialog}
  workspaceId={page.workspaceId}
/>

<ConnectGitLabDialog
  open={dialog?.kind === 'gitlab' || dialog?.kind === 'replace-token'}
  onOpenChange={closeDialog}
  target={gitLabTarget}
/>

<ConfirmOperationAlertDialog
  open={!!disconnecting}
  onOpenChange={closeDialog}
  title={disconnecting ? t(messages.disconnectTitle(disconnecting.account)) : ''}
  description={disconnecting
    ? `${t(messages.disconnectProjects(disconnecting.projectCount))} ${t(
        disconnecting.provider === 'github' ? messages.disconnectGitHub : messages.disconnectGitLab,
      )}`
    : ''}
  continueLabel={t(messages.disconnect)}
  isLoading={page.removing}
  onContinue={() => disconnecting && page.disconnect(disconnecting)}
/>
