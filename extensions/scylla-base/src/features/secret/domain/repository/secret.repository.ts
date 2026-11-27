import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
  WorkspaceSecret,
  WorkspaceSecretSearch,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';

export interface SecretRepository {
  listByProjectId(projectId: string): Promise<SecretEntity[]>;
  /**
   * One page of the secrets of a workspace that match the text, in the projects where the caller
   * can list them. `signal` stops the call.
   */
  searchWorkspace(search: WorkspaceSecretSearch, signal?: AbortSignal): Promise<WorkspaceSecret[]>;
  create(input: CreateSecretInput): Promise<SecretEntity>;
  update(input: UpdateSecretInput): Promise<SecretEntity>;
  listPipelinesUsing(projectId: string, secretName: string): Promise<SecretUsage>;
  deleteById(secretId: string): Promise<void>;
}
