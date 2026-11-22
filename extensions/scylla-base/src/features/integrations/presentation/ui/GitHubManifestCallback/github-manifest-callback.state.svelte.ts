import { currentSearch, navigateTo } from '@platform/context';
import { createMutation } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { gitProvidersMessages as messages } from '@base/features/integrations/presentation/messages/git-providers.messages.ts';
import { GIT_PROVIDERS_URL } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
import { manifestErrorText } from '@base/features/integrations/presentation/presenters/vcs-app.presenter.ts';
import { vcsAppMutations } from '@base/features/integrations/presentation/vcs-app.queries.ts';

/** The values of the redirect of GitHub after the creation of the App. */
const readRedirect = () => {
  const params = new URLSearchParams(currentSearch());
  return { code: params.get('code') ?? '', state: params.get('state') ?? '' };
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
    /** The Git providers page, to start again. */
    backHref: GIT_PROVIDERS_URL,
    /** Sends the values one time: the server refuses a state that was used. */
    start: () => {
      if (!valid || !complete.isIdle) return;
      complete.mutate(redirect, {
        onSuccess: () => navigateTo(GIT_PROVIDERS_URL, { replace: true }),
      });
    },
  };
};
