import type { AccessScope } from '@platform/authz';

export interface AppEntity {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Metadata only. Any enabled secret authenticates; disabling rejects it, revoking deletes it. */
export interface AppSecretEntity {
  id: string;
  appId: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The secret is returned once, at creation, and never again. */
export interface CreatedApp {
  app: AppEntity;
  secret: string;
}

/** The secret is shown once. */
export interface CreatedAppSecret {
  credential: AppSecretEntity;
  secret: string;
}

/** One grant of an app, with the names to show it. */
export interface AppAccess {
  grantId: string;
  scope: AccessScope;
  /** The organization or the project. Empty for the system scope. */
  scopeId: string;
  /** `null` for the system scope. */
  organizationId: string | null;
  organizationName: string;
  /** Empty unless the scope is a project. */
  projectName: string;
  roleId: string;
  roleName: string;
}

/** A new secret (shown once), and what became of the secrets that existed before it. */
export interface ResetAppSecret {
  created: CreatedAppSecret;
  revoked: AppSecretEntity[];
  /** Left enabled on request. */
  kept: AppSecretEntity[];
  /** The revoke failed: still enabled. */
  failed: AppSecretEntity[];
}
