import type {
  AppEntity,
  AppSecretEntity,
} from '@base/features/apps/domain/entities/app.entity.ts';

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

export type AppAccessScope = 'system' | 'organization' | 'project';

/** One grant of an app, with the names to show it. */
export interface AppAccess {
  grantId: string;
  scope: AppAccessScope;
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
