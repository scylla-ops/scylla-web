<script lang="ts">
  import { activeWorkspaceSlug, contextStore, currentSearch } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { newProjectMessages as messages } from '@base/features/integrations/presentation/messages/new-project.messages.ts';
  import { repositoryMessages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import {
    connectionIdIn,
    newGitHubProjectUrl,
    repositorySettingsUrl,
  } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
  import ConnectGitHubDialog from '../ConnectGitHubDialog/ConnectGitHubDialog.svelte';
  import ProjectDetails from './ProjectDetails.svelte';
  import RepositoryStep from './RepositoryStep.svelte';
  import { createNewGitHubProject } from './new-github-project.state.svelte.ts';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const slug = $derived(context().workspace.slug ?? activeWorkspaceSlug() ?? '');

  const page = createNewGitHubProject({
    workspaceId: () => workspaceId,
    connectionId: connectionIdIn(currentSearch()),
  });

  let connecting = $state(false);
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
  <header class="flex flex-col gap-1">
    <p class="text-xs font-medium text-muted-foreground">{t(messages.step(page.step))}</p>
    <h1>{t(page.step === 1 ? messages.pickTitle : messages.nameTitle)}</h1>
    <p class="text-sm text-muted-foreground">
      {t(page.step === 1 ? repositoryMessages.dialogDescription : messages.nameDescription)}
    </p>
  </header>

  {#if page.step === 1}
    <RepositoryStep {page} backHref="/{slug}/projects/new" onConnect={() => (connecting = true)} />
  {:else}
    <ProjectDetails {page} settingsHref={repositorySettingsUrl(slug, page.projectId)} />
  {/if}
</div>

<ConnectGitHubDialog
  open={connecting}
  onOpenChange={open => (connecting = open)}
  {workspaceId}
  returnTo={slug ? newGitHubProjectUrl(slug) : undefined}
/>
