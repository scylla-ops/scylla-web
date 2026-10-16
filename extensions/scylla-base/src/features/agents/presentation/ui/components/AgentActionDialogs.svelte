<script lang="ts">
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type {
    AgentActions,
  } from './agent-actions.state.svelte.ts';
  import { agentsMessages } from '../agents.messages.ts';
  import DisableAgentDialog from './DisableAgentDialog/DisableAgentDialog.svelte';
  import ResetSecretDialog from './ResetSecretDialog/ResetSecretDialog.svelte';

  interface Props {
    actions: AgentActions;
  }

  let { actions }: Props = $props();
</script>

<!-- The confirmations of `AgentActions`, for the page that owns them. -->
<ResetSecretDialog agent={actions.resetting} onClose={actions.closeReset} />

<DisableAgentDialog
  agent={actions.disabling}
  isPending={actions.isToggling}
  onCancel={actions.cancelDisable}
  onConfirm={actions.confirmDisable}
/>

<ConfirmOperationAlertDialog
  open={actions.deleting !== null}
  onOpenChange={open => {
    if (!open) actions.cancelDelete();
  }}
  onContinue={actions.confirmDelete}
  isLoading={actions.isDeleting}
  title={t(agentsMessages.deleteAgentTitle(actions.deleting?.name ?? ''))}
  description={t(agentsMessages.deleteAgentBody)}
  continueLabel={t(agentsMessages.deleteAgent)}
/>
