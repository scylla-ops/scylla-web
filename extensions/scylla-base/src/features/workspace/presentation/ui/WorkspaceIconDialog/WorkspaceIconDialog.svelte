<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceMessages } from '../../messages/workspace.messages.ts';
  import WorkspaceIconForm from './WorkspaceIconForm.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>;
  }

  let { open, onOpenChange, workspace }: Props = $props();
</script>

<!-- The form is built again at each opening: it starts on the icon of the workspace. -->
<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(workspaceMessages.iconTitle)}
  description={t(workspaceMessages.iconDescription)}
  stable={37}
  class="sm:max-w-lg"
>
  <WorkspaceIconForm {workspace} close={() => onOpenChange(false)} />
</ScyllaDialog>
