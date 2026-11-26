/** Metadata only: the value is write-only and never returned. */
export interface SecretEntity {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** A secret of a list of the workspace, with the name of its project. Never a value. */
export interface WorkspaceSecret {
  secret: SecretEntity;
  projectName: string;
}

/** The secrets of a workspace whose name or project name holds `text`, newest first. */
export interface WorkspaceSecretSearch {
  workspaceId: string;
  /** Empty: each secret. */
  text: string;
  limit: number;
}

/** `value` is sent once and never stored. */
export interface CreateSecretInput {
  projectId: string;
  name: string;
  value: string;
}

/** The value is the only thing that changes: the name is the key that pipelines use. */
export interface UpdateSecretInput {
  secretId: string;
  value: string;
}
