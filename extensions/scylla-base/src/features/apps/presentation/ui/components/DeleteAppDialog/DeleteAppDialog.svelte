<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
  import DeleteAppForm from './DeleteAppForm.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appId: string;
    appName: string;
    onDeleted: () => void;
    /** The texts of another app. */
    app?: boolean;
  }

  let { open, onOpenChange, appId, appName, onDeleted, app = false }: Props = $props();
</script>

<!-- The danger zone and the menu of the header open it. The form starts empty at each opening. -->
<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(messages.deleteTitle(appName))}
  description={app ? t(appPageMessages.dangerBody) : t(messages.deleteBody)}
  class="sm:max-w-md"
>
  <DeleteAppForm
    {appId}
    {appName}
    {app}
    close={() => onOpenChange(false)}
    onDeleted={() => {
      onOpenChange(false);
      onDeleted();
    }}
  />
</ScyllaDialog>
