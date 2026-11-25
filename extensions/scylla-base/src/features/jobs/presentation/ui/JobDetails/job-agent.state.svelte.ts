import { Permission, can } from '@platform/authz';
import { activeWorkspaceSlug, contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { appQueries } from '@base/features/apps';

/**
 * The agent of a job: its name, and the link of its page. The agent page needs READ_APP: without
 * it, the id stays plain text and there is no link.
 */
export const createJobAgent = (agentId: () => string | undefined) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const canOpen = $derived(can(Permission.READ_APP, { workspaceId }));
  const agent = createQuery(() => ({
    ...appQueries.byId(agentId() ?? '', workspaceId),
    refetchInterval: false,
  }));

  const hrefOf = (id: string) => `/${activeWorkspaceSlug() ?? ''}/agents/${id}`;

  return {
    /** The name once it arrives, the id before. */
    get name() {
      const id = agentId() ?? '';
      return canOpen ? (agent.data?.app.name ?? id) : id;
    },
    get href() {
      const id = agentId();
      return canOpen && id ? hrefOf(id) : undefined;
    },
    /** The link of another agent, or `undefined` without READ_APP. */
    get hrefOf() {
      return canOpen ? hrefOf : undefined;
    },
  };
};
