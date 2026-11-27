<script lang="ts">
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { Button } from '@scylla/ui/primitives';
  import { DangerZone } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    /** Opens the dialog that asks for the name. */
    onDelete: () => void;
    /** The texts of another app. */
    app?: boolean;
  }

  let { onDelete, app = false }: Props = $props();
</script>

{#snippet deleteButton()}
  <Button variant="destructive" onclick={onDelete}>
    <TrashIcon class="size-4" aria-hidden="true" />
    {app ? t(appPageMessages.deleteApp) : t(messages.deleteAgent)}
  </Button>
{/snippet}

<DangerZone
  title={app ? t(appPageMessages.dangerTitle) : t(messages.dangerTitle)}
  description={app ? t(appPageMessages.dangerBody) : t(messages.dangerBody)}
  action={deleteButton}
/>
