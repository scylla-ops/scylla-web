import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingRepository } from '@base/features/onboarding/domain/repository/onboarding.repository.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import type { OnboardingLocalDataSource } from '@base/features/onboarding/infrastructure/repository/data-sources/onboarding-local.data-source.ts';
import { StoredOnboardingMapper } from '@base/features/onboarding/infrastructure/repository/mappers/stored-onboarding.mapper.ts';

const storageKey = (userId: string) => `onboarding:${userId}`;

export class DefaultOnboardingRepository implements OnboardingRepository {
  constructor(private readonly localDataSource: OnboardingLocalDataSource) {}

  public getStatus(userId: string): Promise<ScyllaResult<OnboardingStatus>> {
    return Promise.resolve(
      ScyllaResult.try(
        () => StoredOnboardingMapper.toStatus(this.localDataSource.read(storageKey(userId))),
        'Failed to read the onboarding progress',
      ),
    );
  }

  public saveStatus(userId: string, status: OnboardingStatus): Promise<ScyllaResult<void>> {
    return Promise.resolve(
      ScyllaResult.try(
        () =>
          this.localDataSource.write(storageKey(userId), StoredOnboardingMapper.toStored(status)),
        'Failed to save the onboarding progress',
      ),
    );
  }
}
