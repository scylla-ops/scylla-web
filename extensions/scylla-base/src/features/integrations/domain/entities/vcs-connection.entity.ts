import type { VcsProvider } from '../structs/vcs-provider.struct.ts';

/** The state of a connection, or of the link of a repository. */
export type ConnectionState = 'active' | 'suspended' | 'needs_attention' | 'disconnected';

export type AccountKind = 'organization' | 'user' | 'service_account';

/** How Scylla learns about the new commits. */
export type DeliveryMode = 'webhook' | 'polling';

/**
 * A connection of a workspace to a Git provider: an installation of the GitHub App, or the token
 * of a GitLab service account. All the projects of the workspace can use it. It holds no token.
 */
export interface VcsConnectionEntity {
  id: string;
  workspaceId: string;
  provider: VcsProvider;
  /** The login of the account, for example acme or scylla-bot. */
  account: string;
  accountKind: AccountKind;
  /** Empty when the account has none. */
  avatarUrl: string;
  state: ConnectionState;
  /** A stable code, for example APP_UNINSTALLED or TOKEN_EXPIRED. Empty when active. */
  stateReason: string;
  deliveryMode: DeliveryMode;
  pollIntervalSeconds: number;
  /** False when an owner selected some repositories on GitHub. */
  allRepositories: boolean;
  /** The repositories (GitHub) or projects (GitLab) that the connection can see. */
  repositoryCount: number;
  /** The projects of the workspace that have a repository of this connection. */
  projectCount: number;
  /** GitLab only. Absent for a token with no expiry. */
  tokenExpiresAt?: string;
  /** GitLab only, for example `api`. */
  scopes: string[];
  /** The permissions that Scylla asks for and that the connection does not have. */
  missingPermissions: string[];
  /** The installation settings on GitHub, the profile of the account on GitLab. */
  settingsUrl: string;
  createdBy: string;
  createdAt: string;
}

/** Where the browser goes to install the GitHub App. */
export interface GitHubInstall {
  installUrl: string;
  expiresAt: string;
}

/**
 * The values of the redirect of GitHub: after the install, after the authorize page (the state
 * carries the installation, with no `installationId`), or after a change of the installation on
 * GitHub (no state).
 */
export interface CompleteGitHubInstallInput {
  /** Empty after a change of the installation on GitHub. */
  state: string;
  /** Empty when the install was cancelled, and after the authorize page. */
  installationId: string;
  /** Empty when the App was already installed on the account: the user authorizes it first. */
  code: string;
  /** `install`, `update` or `request`. Empty after the authorize page. */
  setupAction: string;
}

/**
 * What the server did with the values of the redirect: the new or refreshed connection, or the
 * authorize page of GitHub, where the user goes first when GitHub sent no code.
 */
export type CompletedGitHubInstall =
  | { kind: 'connected'; connection: VcsConnectionEntity }
  | { kind: 'authorize'; authorizeUrl: string };

export interface ConnectGitLabInput {
  workspaceId: string;
  /** Sent one time, never stored in the app. */
  token: string;
}

export interface ReplaceGitLabTokenInput {
  id: string;
  token: string;
}

/**
 * The connection after a GitLab token was checked and saved, with the warnings of the check:
 * `NOT_A_SERVICE_ACCOUNT`, `TOKEN_EXPIRES_SOON` and `ROLE_DEVELOPER`.
 */
export interface CheckedGitLabConnection {
  connection: VcsConnectionEntity;
  warnings: string[];
}

/** A repository (GitHub) or a project (GitLab) that a connection can see. */
export interface ProviderRepository {
  externalId: string;
  /** For example acme/api. */
  fullName: string;
  webUrl: string;
  defaultBranch: string;
  private: boolean;
  /** The role of the service account on GitLab. Empty on GitHub. */
  role: string;
  /** The project of the workspace that has the link to it. Absent when no project has it. */
  linkedProjectId?: string;
}

export interface ProviderRepositoryPage {
  repositories: ProviderRepository[];
  /** Empty on the last page. */
  nextPageToken: string;
}

/** The time of the expiry is in less than 14 days: the server warns at this point too. */
const EXPIRY_WARNING_MS = 14 * 24 * 60 * 60 * 1000;

/** True when the token of a GitLab connection expires within 14 days, or expired. */
export const tokenExpiresSoon = (connection: VcsConnectionEntity, now: number): boolean =>
  !!connection.tokenExpiresAt &&
  new Date(connection.tokenExpiresAt).getTime() - now < EXPIRY_WARNING_MS;
