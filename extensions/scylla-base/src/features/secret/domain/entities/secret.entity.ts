/** Metadata only: the value is write-only and never returned. */
export interface SecretEntity {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
