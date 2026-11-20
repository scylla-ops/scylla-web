import { createMutation } from '@scylla/core-sdk';
import type {
  CheckedGitLabConnection,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import {
  gitLabErrorText,
  gitLabWarningTexts,
} from '@base/features/integrations/presentation/presenters/connection-errors.presenter.ts';
import { vcsConnectionMutations } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

export interface GitLabTokenTarget {
  workspaceId: string;
  /** Present: replace the token of this connection. Absent: make a new connection. */
  connection?: VcsConnectionEntity;
}

/**
 * The token field of a GitLab connection, and the check of the server. The token is sent one
 * time and is not kept after the check. Construct it during component initialisation.
 */
export const createGitLabToken = (target: () => GitLabTokenTarget) => {
  const connect = createMutation(() => vcsConnectionMutations.connectGitLab());
  const replace = createMutation(() =>
    vcsConnectionMutations.replaceGitLabToken(target().workspaceId),
  );

  let token = $state('');
  const replacing = $derived(!!target().connection);
  const mutation = $derived(replacing ? replace : connect);
  const result = $derived<CheckedGitLabConnection | undefined>(mutation.data);

  return {
    get token() {
      return token;
    },
    set token(value: string) {
      token = value;
      // A new value clears the refusal of the old one.
      if (mutation.isError) mutation.reset();
    },
    get replacing() {
      return replacing;
    },
    get pending() {
      return mutation.isPending;
    },
    get canSubmit() {
      return token.trim().length > 0 && !mutation.isPending;
    },
    get error(): string | null {
      return mutation.isError ? gitLabErrorText(mutation.error) : null;
    },
    get result() {
      return result;
    },
    warnings: (now: number): string[] =>
      result ? gitLabWarningTexts(result.warnings, result.connection.tokenExpiresAt, now) : [],
    submit: () => {
      const value = token.trim();
      if (!value || mutation.isPending) return;
      const { workspaceId, connection } = target();
      if (connection) replace.mutate({ id: connection.id, token: value });
      else connect.mutate({ workspaceId, token: value });
      token = '';
    },
  };
};
