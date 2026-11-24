import type { ApiToken } from '@shared/domain/structs/api-token.struct.ts';

/** The personal tokens of a user: they act as this user, with the roles of this user. */
export interface PersonalTokens {
  /** Newest first, with the revoked and the expired ones. */
  tokens: ApiToken[];
  /** False: the server refuses each personal token. */
  enabled: boolean;
  /** The workspaces of the user that refuse them. */
  refusedWorkspaceIds: string[];
}
