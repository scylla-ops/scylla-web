<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { fragmentMutations } from '@base/features/pipeline';
  import { userQueries } from '@base/features/user';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import AddToLibraryForm from './AddToLibraryForm.svelte';
  import type { PackagePage } from './package-page.state.svelte.ts';

  let { page }: { page: PackagePage } = $props();

  const context = toRune(contextStore);
  const meQuery = createQuery(() => userQueries.me());
  const add = createMutation(() => fragmentMutations.addFromMarketplace());

  const pkg = $derived(page.pkg);
  const author = $derived(
    meQuery.data && { id: meQuery.data.id, name: meQuery.data.displayName || meQuery.data.username },
  );

  const close = () => (page.adding = null);
</script>

<ScyllaDialog
  open={page.adding !== null}
  onOpenChange={open => {
    if (!open) close();
  }}
  title={pkg ? t(marketplaceMessages.addTitle(pkg.name, page.workspaceName)) : ''}
  description={pkg
    ? t(
        marketplaceMessages.addDescription(pkg.publisher.handle, page.workspaceName),
      )
    : ''}
  class="sm:max-w-xl"
>
  {#if pkg && page.adding}
    <AddToLibraryForm
      {pkg}
      mode={page.adding}
      workspace={page.workspaceName}
      takenNames={page.fragmentNames}
      pending={add.isPending || !author}
      onCancel={close}
      onAdd={form => {
        const workspaceId = context().workspace.id;
        const input = author && workspaceId && form.input(workspaceId, author);
        if (!input) return;
        // The new fragment opens: its page tells what comes next, linked or forked.
        add.mutate(input, {
          onSuccess: created => {
            close();
            scyllaNavigate.goToWorkspaceRoute(`library/${created.id}`);
          },
        });
      }}
    />
  {/if}
</ScyllaDialog>
