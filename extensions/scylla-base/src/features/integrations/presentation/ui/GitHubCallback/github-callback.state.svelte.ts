import { contextStore, currentSearch, navigateTo } from '@platform/context';
import { createMutation, getQueryClient } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { workspaceQueries } from '@base/features/workspace';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { connectGitHubMessages as messages } from '@base/features/integrations/presentation/messages/connect-github.messages.ts';
import { installErrorText } from '@base/features/integrations/presentation/presenters/connection-errors.presenter.ts';
import { integrationsUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
import { vcsConnectionMutations } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

/** The values of the redirect of GitHub. The state is the only one that is always there. */
const readRedirect = () => {
  const params = new URLSearchParams(currentSearch());
  return {
    state: params.get('state') ?? '',
    installationId: params.get('installation_id') ?? '',
    code: params.get('code') ?? '',
    setupAction: params.get('setup_action') ?? '',
  };
};

/** The page of the workspace of the connection; the active workspace when the list fails. */
const openIntegrations = async (connection: VcsConnectionEntity): Promise<void> => {
  const workspaces = await getQueryClient()
    .fetchQuery(workspaceQueries.mine())
    .catch(() => []);
  const workspace = workspaces.find(item => item.id === connection.workspaceId);
  if (workspace) contextStore.getState().setWorkspace(workspace.id, workspace.name, workspace.slug);
  const slug = workspace?.slug ?? contextStore.getState().workspace.slug;
  navigateTo(slug ? integrationsUrl(slug, connection.id) : '/', { replace: true });
};

/**
 * The page where GitHub sends the browser after the install. The server checks the state, and
 * that the user can see the installation. Construct it during component initialisation.
 */
export const createGitHubCallback = () => {
  const redirect = readRedirect();
  const complete = createMutation(() => vcsConnectionMutations.completeGitHubInstall());

  return {
    get failed() {
      return !redirect.state || complete.isError;
    },
    get error(): string {
      if (!redirect.state) return t(messages.stateExpired);
      return complete.isError ? installErrorText(complete.error) : '';
    },
    /** The Integrations page of the active workspace, to start again. */
    get backHref(): string {
      const { slug } = contextStore.getState().workspace;
      return slug ? integrationsUrl(slug) : '/';
    },
    /** Sends the values one time: the server refuses a state that was used. */
    start: () => {
      if (!redirect.state || !complete.isIdle) return;
      complete.mutate(redirect, { onSuccess: connection => void openIntegrations(connection) });
    },
  };
};
