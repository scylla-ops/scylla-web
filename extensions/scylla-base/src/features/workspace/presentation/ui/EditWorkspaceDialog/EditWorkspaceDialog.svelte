<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';
  import EditWorkspaceForm from './EditWorkspaceForm.svelte';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>;
  }

  let { open, setOpen, workspace }: Props = $props();
</script>

<!-- The form is built again at each opening: it starts on the icon of the workspace. -->
<ScyllaDialog
  {open}
  onOpenChange={setOpen}
  title={t(workspaceMessages.editTitle)}
  description={t(workspaceMessages.editDescription)}
>
  <EditWorkspaceForm {workspace} close={() => setOpen(false)} />
</ScyllaDialog>
