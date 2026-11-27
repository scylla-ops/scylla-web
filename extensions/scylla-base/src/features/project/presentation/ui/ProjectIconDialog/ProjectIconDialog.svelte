<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '../../messages/project.messages.ts';
  import ProjectIconForm from './ProjectIconForm.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: ProjectEntity;
    /** The second line next to the preview, e.g. the linked repository. */
    subtitle?: string;
  }

  let { open, onOpenChange, project, subtitle }: Props = $props();
</script>

<!-- The form is built again at each opening: it starts on the icon of the project. -->
<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(projectMessages.iconTitle)}
  description={t(projectMessages.iconDescription)}
  stable={37}
  class="sm:max-w-lg"
>
  <ProjectIconForm {project} {subtitle} close={() => onOpenChange(false)} />
</ScyllaDialog>
