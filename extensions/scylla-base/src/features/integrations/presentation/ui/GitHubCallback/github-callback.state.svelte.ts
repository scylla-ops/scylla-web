import { contextStore, currentSearch, navigateTo } from '@platform/context';
import { createMutation, getQueryClient } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { workspaceQueries } from '@base/features/workspace';
import type {
  CompletedGitHubInstall,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { connectGitHubMessages as messages } from '@base/features/integrations/presentation/messages/connect-github.messages.ts';
import { installErrorText } from '@base/features/integrations/presentation/presenters/connection-errors.presenter.ts';
import { integrationsUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
import { vcsConnectionMutations } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

/** The values of the redirect of GitHub. Each one can be empty. */
const readRedirect = () => {
  const params = new URLSearchParams(currentSearch());
  return {
    state: params.get('state') ?? '',
    installationId: params.get('installation_id') ?? '',
    code: params.get('code') ?? '',
    setupAction: params.get('setup_action') ?? '',
  };
};

/**
 * The page of the workspace of the connection; the active workspace when the list fails. A new
 * connection shows its next step (`connected`), a refreshed one does not.
 */
const openIntegrations = async (
  connection: VcsConnectionEntity,
  connected: boolean,
): Promise<void> => {
  const workspaces = await getQueryClient()
    .fetchQuery(workspaceQueries.mine())
    .catch(() => []);
  const workspace = workspaces.find(item => item.id === connection.workspaceId);
  if (workspace) contextStore.getState().setWorkspace(workspace.id, workspace.name, workspace.slug);
  const slug = workspace?.slug ?? contextStore.getState().workspace.slug;
  const page = slug ? integrationsUrl(slug, connected ? connection.id : undefined) : '/';
  navigateTo(page, { replace: true });
};

/** A connection opens its page; the authorize page of GitHub is on another site. */
const follow = (completed: CompletedGitHubInstall, connected: boolean): void => {
  if (completed.kind === 'authorize') window.location.assign(completed.authorizeUrl);
  else void openIntegrations(completed.connection, connected);
};

/**
 * The page where GitHub sends the browser: after the install (with a state), after the authorize
 * page (the state carries the installation), or after a change of the installation on GitHub (no
 * state). The server checks the state, and that the user can see the installation. Construct it
 * during component initialisation.
 */
export const createGitHubCallback = () => {
  const redirect = readRedirect();
  const changedOnGitHub = !redirect.state && !!(redirect.installationId || redirect.code);
  const refreshes = changedOnGitHub && !!redirect.installationId && !!redirect.code;
  const complete = createMutation(() => vcsConnectionMutations.completeGitHubInstall());

  return {
    /** A change on GitHub is saved there, also when Scylla cannot refresh its connection. */
    get saved() {
      return changedOnGitHub && (!refreshes || complete.isError);
    },
    get failed() {
      return !changedOnGitHub && (!redirect.state || complete.isError);
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
      if (!complete.isIdle || !(redirect.state || refreshes)) return;
      complete.mutate(redirect, { onSuccess: completed => follow(completed, !refreshes) });
    },
  };
};
