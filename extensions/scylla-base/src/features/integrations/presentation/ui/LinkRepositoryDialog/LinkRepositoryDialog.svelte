<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import LinkRepositoryForm from './LinkRepositoryForm.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    canViewIntegrations: boolean;
  }

  let { open, onOpenChange, projectId, workspaceId, workspaceSlug, canViewIntegrations }: Props =
    $props();
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(messages.dialogTitle)}
  description={t(messages.dialogDescription)}
  class="sm:max-w-lg"
>
  <LinkRepositoryForm
    {projectId}
    {workspaceId}
    {workspaceSlug}
    {canViewIntegrations}
    onClose={() => onOpenChange(false)}
  />
</ScyllaDialog>
