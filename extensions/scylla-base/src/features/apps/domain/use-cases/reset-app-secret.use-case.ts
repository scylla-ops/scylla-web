import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import type {
  AppSecretEntity,
  ResetAppSecret,
} from '@base/features/apps/domain/entities/app.entity.ts';
import { trimSecretLabel } from '@base/features/apps/domain/structs/secret-label.struct.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';

export interface ResetAppSecretInput {
  appId: string;
  /** The label of the new secret, from the user. `suggestSecretLabel` gives the default. */
  label: string;
  /** Revoke every secret that existed before the new one. */
  revokeOthers: boolean;
}

/**
 * Lists the secrets, creates a new one, then revokes the others when asked. A failed revoke
 * does not fail the reset: the new secret exists, and it is shown only in this result.
 */
export class ResetAppSecretUseCase {
  constructor(private readonly _repository: AppsRepository) {}

  public async execute({
    appId,
    label,
    revokeOthers,
  }: ResetAppSecretInput): Promise<ScyllaResult<ResetAppSecret>> {
    const listed = await this._repository.listAppSecrets(appId);

    return listed.flatMapAsync(async previous => {
      const created = await this._repository.createAppSecret(appId, trimSecretLabel(label));

      return created.flatMapAsync(async (credential): Promise<ScyllaResult<ResetAppSecret>> => {
        if (!revokeOthers) {
          return created.map(() => ({
            created: credential,
            revoked: [],
            kept: previous,
            failed: [],
          }));
        }

        const revoked: AppSecretEntity[] = [];
        const failed: AppSecretEntity[] = [];
        for (const secret of previous) {
          const result = await this._repository.revokeAppSecret(secret.id);
          result.fold({
            onSuccess: () => revoked.push(secret),
            onError: () => failed.push(secret),
          });
        }

        return created.map(() => ({ created: credential, revoked, kept: [], failed }));
      });
    });
  }
}
