<script lang="ts">
  import FolderGit2Icon from '@lucide/svelte/icons/folder-git-2';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import UnlinkIcon from '@lucide/svelte/icons/unlink';
  import { DangerZone, ErrorState, GatedButton, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import LinkRepositoryDialog from '../LinkRepositoryDialog/LinkRepositoryDialog.svelte';
  import RepositoryCard from './RepositoryCard.svelte';
  import ReportsCard from './ReportsCard.svelte';
  import UnlinkDialog from './UnlinkDialog.svelte';
  import { createRepositoryPage } from './repository-page.state.svelte.ts';

  interface Props {
    projectId?: string;
  }

  let { projectId = '' }: Props = $props();

  const page = createRepositoryPage(() => projectId);

  const closeDialog = (open: boolean) => {
    if (!open) page.close();
  };
</script>

<div class="mx-auto flex w-full max-w-5xl shrink-0 flex-col gap-6 pb-20">
  <div>
    <h1>{t(messages.settings)}</h1>
    <p class="text-sm text-muted-foreground">
      {t(messages.description(page.projectName || t(messages.thisProject)))}
    </p>
  </div>

  {#if page.linkQuery.isError && !page.linkQuery.data}
    <ErrorState message={page.linkQuery.error?.message} />
  {:else if page.linkQuery.isPending}
    <ListSkeleton rows={2} rowClass="h-48 w-full rounded-xl" />
  {:else if page.link}
    {@const link = page.link}
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <RepositoryCard {page} {link} />
      <ReportsCard {page} {link} />
    </div>
    {#snippet unlinkButton()}
      <GatedButton
        variant="destructive"
        allowed={page.canManage}
        deniedReason={t(messages.onlyEditors)}
        onclick={() => page.open('unlink')}
      >
        <UnlinkIcon class="size-4" aria-hidden="true" />
        {t(messages.unlink)}
      </GatedButton>
    {/snippet}
    <DangerZone
      title={t(messages.dangerTitle)}
      description={t(messages.dangerBody)}
      action={unlinkButton}
    />
  {:else}
    <section
      class="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
      aria-labelledby="repository-empty"
    >
      <span
        class="flex size-12 items-center justify-center rounded-full bg-muted text-primary"
        aria-hidden="true"
      >
        <FolderGit2Icon class="size-5" />
      </span>
      <h2 id="repository-empty" class="text-xl">{t(messages.emptyTitle)}</h2>
      <p class="max-w-md text-sm text-muted-foreground">{t(messages.emptyBody)}</p>
      <GatedButton
        allowed={page.canManage}
        deniedReason={t(messages.onlyEditors)}
        onclick={() => page.open('link')}
      >
        <PlusIcon class="size-4" aria-hidden="true" />
        {t(messages.linkRepository)}
      </GatedButton>
    </section>
  {/if}
</div>

<LinkRepositoryDialog
  open={page.dialog === 'link'}
  onOpenChange={closeDialog}
  {projectId}
  workspaceId={page.workspaceId}
  workspaceSlug={page.workspaceSlug}
  canViewIntegrations={page.canViewIntegrations}
/>

<UnlinkDialog
  open={page.dialog === 'unlink'}
  onOpenChange={closeDialog}
  name={page.link?.fullName ?? ''}
  stops={page.stops}
  loading={page.unlinking}
  onContinue={page.unlink}
/>
