import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingRepository } from '@base/features/onboarding/domain/repository/onboarding.repository.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import * as storedOnboarding from './stored-onboarding.mapper.ts';

const storageKey = (userId: string) => `onboarding:${userId}`;

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The progress stays in the browser. Read at each call, so importing the module needs no DOM. */
export class DefaultOnboardingRepository implements OnboardingRepository {
  constructor(private readonly storage: () => ProgressStorage = () => localStorage) {}

  public getStatus(userId: string): Promise<ScyllaResult<OnboardingStatus>> {
    return Promise.resolve(
      ScyllaResult.try(
        () => storedOnboarding.toStatus(this.storage().getItem(storageKey(userId))),
        'Failed to read the onboarding progress',
      ),
    );
  }

  public saveStatus(userId: string, status: OnboardingStatus): Promise<ScyllaResult<void>> {
    return Promise.resolve(
      ScyllaResult.try(
        () => this.storage().setItem(storageKey(userId), storedOnboarding.toStored(status)),
        'Failed to save the onboarding progress',
      ),
    );
  }
}
