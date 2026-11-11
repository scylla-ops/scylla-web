import { can, Permission } from '@platform/authz';
import { contextStore, currentPathname, currentSearch, navigateTo } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import {
  vcsConnectionMutations,
  vcsConnectionQueries,
} from '@base/features/integrations/presentation/vcs-connection.queries.ts';
import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
import { connectedIdIn } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';

/** The open dialog of the page. */
export type IntegrationsDialog =
  | { kind: 'github' }
  | { kind: 'gitlab' }
  | { kind: 'replace-token'; connection: VcsConnectionEntity }
  | { kind: 'disconnect'; connection: VcsConnectionEntity };

/** The ViewModel of the Integrations page. Construct it during component initialisation. */
export const createIntegrationsPage = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const canManage = $derived(can(Permission.MANAGE_VCS_CONNECTIONS, { workspaceId }));

  const providers = createQuery(() => vcsConnectionQueries.providers(workspaceId));
  const connections = createQuery(() => vcsConnectionQueries.byWorkspace(workspaceId));
  const remove = createMutation(() => vcsConnectionMutations.remove(workspaceId));

  let dialog = $state<IntegrationsDialog | null>(null);

  const all = $derived(connections.data ?? []);
  const connectedId = $derived(connectedIdIn(currentSearch()));

  return {
    get workspaceId() {
      return workspaceId;
    },
    get canManage() {
      return canManage;
    },
    providers,
    connections,
    get all() {
      return all;
    },
    has: (provider: VcsProvider) => all.some(connection => connection.provider === provider),
    providerInfo: (provider: VcsProvider) =>
      providers.data?.find(info => info.provider === provider),
    /** The connection that the GitHub callback just made, for the success card. */
    get justConnected() {
      return connectedId ? all.find(connection => connection.id === connectedId) : undefined;
    },
    /** The first connection that stopped, for the banner at the top of the page. */
    get broken() {
      return all.find(
        connection => connection.state === 'disconnected' || connection.state === 'suspended',
      );
    },
    dismissConnected: () => navigateTo(currentPathname(), { replace: true }),

    get dialog() {
      return dialog;
    },
    open: (next: IntegrationsDialog) => (dialog = next),
    close: () => (dialog = null),

    get removing() {
      return remove.isPending;
    },
    disconnect: (connection: VcsConnectionEntity) =>
      remove.mutate(connection.id, {
        onSuccess: () => {
          toast.success(t(messages.disconnectedToast(connection.account)));
          dialog = null;
        },
      }),
  };
};

export type IntegrationsPage = ReturnType<typeof createIntegrationsPage>;
