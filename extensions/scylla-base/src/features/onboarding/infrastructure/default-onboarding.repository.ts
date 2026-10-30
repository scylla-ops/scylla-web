import type { OnboardingRepository } from '@base/features/onboarding/domain/repository/onboarding.repository.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import * as storedOnboarding from './stored-onboarding.mapper.ts';

const storageKey = (userId: string) => `onboarding:${userId}`;

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The progress stays in the browser. Read at each call, so importing the module needs no DOM. */
export class DefaultOnboardingRepository implements OnboardingRepository {
  constructor(private readonly storage: () => ProgressStorage = () => localStorage) {}

  /** Inside `then`: a storage that throws (blocked, full) rejects the promise. */
  public getStatus(userId: string): Promise<OnboardingStatus> {
    return Promise.resolve().then(() =>
      storedOnboarding.toStatus(this.storage().getItem(storageKey(userId))),
    );
  }

  public saveStatus(userId: string, status: OnboardingStatus): Promise<void> {
    return Promise.resolve().then(() =>
      this.storage().setItem(storageKey(userId), storedOnboarding.toStored(status)),
    );
  }
}
