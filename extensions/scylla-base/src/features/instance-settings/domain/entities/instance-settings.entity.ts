export interface InstanceSettings {
  /** False: the server refuses each personal token. */
  personalTokensEnabled: boolean;
  /** The personal tokens that a change of the switch stops or starts again. */
  activePersonalTokens: number;
  /** The workspaces that one user can create. The personal one does not count. */
  workspaceLimit: number;
}
