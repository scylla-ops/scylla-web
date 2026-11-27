<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { imageUrl } from '@platform/grpc';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceMessages } from '../../messages/workspace.messages.ts';
  import { WorkspaceIcon } from '@shared/presentation/ui';
  import WorkspaceIconDialog from '../WorkspaceIconDialog/WorkspaceIconDialog.svelte';

  interface Props {
    workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>;
  }

  let { workspace }: Props = $props();

  const canChange = $derived(can(Permission.UPDATE_WORKSPACE, { workspaceId: workspace.id }));
  let dialogOpen = $state(false);
</script>

<!-- The icon at the top of the settings. A click changes it, for a member who may edit the workspace. -->
{#if canChange}
  <Tooltip>
    <TooltipTrigger
      aria-label={t(workspaceMessages.changeIcon)}
      class="focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center justify-center rounded-xl transition-opacity outline-none hover:opacity-80 focus-visible:ring-[3px] motion-reduce:transition-none"
      onclick={() => (dialogOpen = true)}
    >
      <WorkspaceIcon icon={workspace.icon} {imageUrl} size={48} />
    </TooltipTrigger>
    <TooltipContent side="top">{t(workspaceMessages.changeIcon)}</TooltipContent>
  </Tooltip>
  <WorkspaceIconDialog open={dialogOpen} onOpenChange={open => (dialogOpen = open)} {workspace} />
{:else}
  <WorkspaceIcon icon={workspace.icon} {imageUrl} size={48} />
{/if}
