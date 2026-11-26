<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';
  import AddWorkspaceForm from './AddWorkspaceForm.svelte';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    hideCancel?: boolean;
  }

  let { open, setOpen, hideCancel = false }: Props = $props();
</script>

<!-- The form is built again at each opening: it starts blank, on the default icon. -->
<ScyllaDialog
  {open}
  onOpenChange={setOpen}
  title={t(workspaceMessages.createTitle)}
  description={t(workspaceMessages.createDescription)}
  dismissible={!hideCancel}
>
  <AddWorkspaceForm close={() => setOpen(false)} {hideCancel} />
</ScyllaDialog>
