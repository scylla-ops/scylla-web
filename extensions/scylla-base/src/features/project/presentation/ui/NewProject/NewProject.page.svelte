<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { can, Permission } from '@platform/authz';
  import { activeWorkspaceSlug, contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { ProviderMark } from '@shared/presentation/ui';
  import { projectMessages as messages } from '@base/features/project/presentation/messages/project.messages.ts';
  import ProjectKindCard from './ProjectKindCard.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const base = $derived(`/${context().workspace.slug ?? activeWorkspaceSlug() ?? ''}/projects/new`);
  const canLink = $derived(can(Permission.MANAGE_REPOSITORY_LINK, { workspaceId }));
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
  <header class="flex flex-col gap-1">
    <h1>{t(messages.newProject)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.newProjectDescription)}</p>
  </header>

  <div class="flex flex-col gap-4 sm:flex-row">
    <ProjectKindCard
      href="{base}/regular"
      title={t(messages.regularTitle)}
      body={t(messages.regularBody)}
      action={t(messages.regularAction)}
      tour="regular-project"
    >
      {#snippet icon()}
        <FolderIcon class="size-6" />
      {/snippet}
    </ProjectKindCard>
    <ProjectKindCard
      href="{base}/github"
      title={t(messages.githubTitle)}
      body={t(messages.githubBody)}
      action={t(messages.githubAction)}
      allowed={canLink}
      deniedReason={t(messages.cannotLink)}
    >
      {#snippet icon()}
        <ProviderMark kind="github" class="size-5" />
      {/snippet}
    </ProjectKindCard>
  </div>
</div>
