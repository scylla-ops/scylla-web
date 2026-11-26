<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import NewGroupForm from './NewGroupForm.svelte';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** The project that moves into the new group. */
    project: ProjectEntity;
  }

  let { open, setOpen, project }: Props = $props();
</script>

<!-- The form is built again at each opening: it starts blank, on the default folder. -->
<ScyllaDialog
  {open}
  onOpenChange={setOpen}
  title={t(projectMessages.newGroup)}
  description={t(projectMessages.newGroupDescription)}
>
  <NewGroupForm {project} close={() => setOpen(false)} />
</ScyllaDialog>
