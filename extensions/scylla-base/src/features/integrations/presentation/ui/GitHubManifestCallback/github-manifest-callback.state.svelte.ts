import { contextStore, currentSearch, navigateTo } from '@platform/context';
import { createMutation, getQueryClient } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { workspaceQueries } from '@base/features/workspace';
import { gitProvidersMessages as messages } from '@base/features/integrations/presentation/messages/git-providers.messages.ts';
import { gitProvidersUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
import { manifestErrorText } from '@base/features/integrations/presentation/presenters/vcs-app.presenter.ts';
import { vcsAppMutations } from '@base/features/integrations/presentation/vcs-app.queries.ts';

/** The values of the redirect of GitHub after the creation of the App. */
const readRedirect = () => {
  const params = new URLSearchParams(currentSearch());
  return { code: params.get('code') ?? '', state: params.get('state') ?? '' };
};

/** The slug of the active workspace, else of the first workspace of the user. */
const workspaceSlug = async (): Promise<string> => {
  const { slug } = contextStore.getState().workspace;
  if (slug) return slug;
  const workspaces = await getQueryClient()
    .fetchQuery(workspaceQueries.mine())
    .catch(() => []);
  const first = workspaces[0];
  if (!first) return '';
  contextStore.getState().setWorkspace(first.id, first.name, first.slug);
  return first.slug;
};

/** The Git providers page: the instance pages are under a workspace. */
const openGitProviders = async (): Promise<void> => {
  const slug = await workspaceSlug();
  navigateTo(slug ? gitProvidersUrl(slug) : '/', { replace: true });
};

/**
 * The page where GitHub sends the browser after the creation of the App. The server checks the
 * state, which is bound to the admin that started the flow. Construct it during component
 * initialisation.
 */
export const createGitHubManifestCallback = () => {
  const redirect = readRedirect();
  const complete = createMutation(() => vcsAppMutations.completeGitHubManifest());
  const valid = !!redirect.code && !!redirect.state;

  return {
    get failed() {
      return !valid || complete.isError;
    },
    get error(): string {
      if (!valid) return t(messages.stateExpired);
      return complete.isError ? manifestErrorText(complete.error) : '';
    },
    /** The Git providers page of the active workspace, to start again. */
    get backHref(): string {
      const { slug } = contextStore.getState().workspace;
      return slug ? gitProvidersUrl(slug) : '/';
    },
    /** Sends the values one time: the server refuses a state that was used. */
    start: () => {
      if (!valid || !complete.isIdle) return;
      complete.mutate(redirect, { onSuccess: () => void openGitProviders() });
    },
  };
};
