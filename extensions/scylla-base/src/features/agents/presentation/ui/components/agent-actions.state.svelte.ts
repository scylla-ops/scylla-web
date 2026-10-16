import { i18n } from '@lingui/core';
import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createMutation } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import { agentMutations } from '@base/features/agents/presentation/agents.queries.ts';

/**
 * The actions on one agent, for the list and the detail page: which ones the user may run, and
 * the agent each confirmation dialog is open for.
 */
export const createAgentActions = (options: { onDeleted?: () => void } = {}) => {
  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id ?? '');

  const setActive = createMutation(() => agentMutations.setActive(organizationId));
  const remove = createMutation(() => agentMutations.remove(organizationId));

  let resetting = $state<AgentEntity | null>(null);
  let disabling = $state<AgentEntity | null>(null);
  let deleting = $state<AgentEntity | null>(null);

  return {
    /** `CreateAppSecret` and `RevokeAppSecret` need `DELETE_APP`; listing the secrets, `READ_APP`. */
    get canReset() {
      return can(Permission.DELETE_APP) && can(Permission.READ_APP);
    },
    get canToggle() {
      return can(Permission.DELETE_APP);
    },
    get canDelete() {
      return can(Permission.DELETE_APP);
    },
    get resetting() {
      return resetting;
    },
    get disabling() {
      return disabling;
    },
    get deleting() {
      return deleting;
    },
    get isToggling() {
      return setActive.isPending;
    },
    get isDeleting() {
      return remove.isPending;
    },

    requestReset: (agent: AgentEntity) => (resetting = agent),
    closeReset: () => (resetting = null),

    requestDisable: (agent: AgentEntity) => (disabling = agent),
    cancelDisable: () => (disabling = null),
    confirmDisable: () => {
      if (!disabling) return;
      setActive.mutate(
        { appId: disabling.id, active: false },
        { onSettled: () => (disabling = null) },
      );
    },
    /** Reversible and harmless: no confirmation. */
    enable: (agent: AgentEntity) => setActive.mutate({ appId: agent.id, active: true }),

    requestDelete: (agent: AgentEntity) => (deleting = agent),
    cancelDelete: () => (deleting = null),
    confirmDelete: () => {
      if (!deleting) return;
      remove.mutate(deleting.id, {
        onSuccess: () => options.onDeleted?.(),
        onSettled: () => (deleting = null),
      });
    },

    copyId: async (agent: AgentEntity) => {
      try {
        await navigator.clipboard.writeText(agent.id);
        toast.success(i18n._(ToastMessages.AGENT_ID_COPIED));
      } catch {
        toast.error(i18n._(ToastMessages.AGENT_ID_COPY_ERROR));
      }
    },
  };
};

export type AgentActions = ReturnType<typeof createAgentActions>;
