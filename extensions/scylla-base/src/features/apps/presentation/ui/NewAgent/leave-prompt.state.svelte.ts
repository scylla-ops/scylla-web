import { scyllaNavigate } from '@platform/context';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
import { holdLeave } from './leave-guard.effect.svelte.ts';
import { connectPath } from './new-agent.state.svelte.ts';

interface LeavePromptInput {
  /** The prompt opens on a leave only while this is `true`. */
  active: boolean;
  agent: Pick<AppEntity, 'id' | 'name'> | null;
  deleting: boolean;
  /** Deletes the agent. A failure keeps the prompt open: its toast tells why. */
  remove: () => Promise<unknown>;
}

/**
 * The question before the user leaves an agent that no machine joined: stay, keep the agent for
 * later, or delete it. Nothing is deleted without this choice.
 */
export const createLeavePrompt = (input: () => LeavePromptInput) => {
  let pending = $state<(() => void) | null>(null);

  holdLeave(
    () => input().active,
    leave => (pending = leave),
  );

  const go = () => {
    const leave = pending;
    pending = null;
    leave?.();
  };

  return {
    get open() {
      return pending !== null;
    },
    get deleting() {
      return input().deleting;
    },
    stay() {
      if (!input().deleting) pending = null;
    },
    keep() {
      const agent = input().agent;
      go();
      if (!agent) return;
      toast.success(t(messages.kept(agent.name)), {
        description: t(messages.keptBody),
        action: {
          label: t(agentsListMessages.finishSetup),
          onClick: () => scyllaNavigate.goToWorkspaceRoute(connectPath(agent.id)),
        },
      });
    },
    delete() {
      if (!input().agent || input().deleting) return;
      input()
        .remove()
        .then(go)
        .catch(() => undefined);
    },
  };
};
