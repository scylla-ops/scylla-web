<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '../../messages/project.messages.ts';
  import EditProjectForm from './EditProjectForm.svelte';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    project: ProjectEntity;
  }

  let { open, setOpen, project }: Props = $props();
</script>

<!-- The form is built again at each opening: Cancel forgets the icon that it did not save. -->
<ScyllaDialog
  {open}
  onOpenChange={setOpen}
  title={t(projectMessages.editTitle)}
  description={t(projectMessages.editDescription)}
  class="sm:max-w-lg"
>
  <EditProjectForm {project} close={() => setOpen(false)} />
</ScyllaDialog>
