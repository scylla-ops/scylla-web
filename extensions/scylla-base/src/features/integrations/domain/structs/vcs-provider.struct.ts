/** A Git provider: GitHub.com through the Scylla GitHub App, GitLab.com through a service account. */
export type VcsProvider = 'github' | 'gitlab';

/** A provider, as a workspace can use it. */
export interface VcsProviderInfo {
  provider: VcsProvider;
  /** True when an admin of the workspace can make a connection now. */
  available: boolean;
  /** A stable code: `APP_MISSING` or `SECRET_KEY_MISSING`. Empty when the provider is available. */
  unavailableReason: string;
  /** For example https://github.com. */
  webUrl: string;
}
