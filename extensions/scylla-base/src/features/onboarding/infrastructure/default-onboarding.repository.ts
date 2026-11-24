import type { UserState, UserStateKey } from '@platform/user-state';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { OnboardingRepository } from '@base/features/onboarding/domain/repository/onboarding.repository.ts';
import {
  mergeStatuses,
  type OnboardingStatus,
} from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import * as storedOnboarding from './stored-onboarding.mapper.ts';

const storageKey = (userId: string) => `onboarding:${userId}`;

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * The progress follows the person: the server holds it, and the browser holds a copy. The reads
 * read the copy and never the server, because the `storage` event of another tab comes before its
 * write reaches the server: a read of the server would move the tour back one step. Read at each
 * call, so importing the module needs no DOM.
 */
export class DefaultOnboardingRepository implements OnboardingRepository {
  private readonly progress: UserStateKey<OnboardingStatus>;

  constructor(
    private readonly state: UserState,
    private readonly storage: () => ProgressStorage = () => localStorage,
  ) {
    this.progress = state.define<OnboardingStatus>({
      key: 'onboarding',
      decode: value => storedOnboarding.toStatus(JSON.stringify(value)),
      readLocal: userId => {
        const raw = this.storage().getItem(storageKey(userId));
        return raw === null ? null : storedOnboarding.toStatus(raw);
      },
      writeLocal: (userId, status) => {
        this.storage().setItem(storageKey(userId), storedOnboarding.toStored(status));
        // The tour reads again at this event: a merge changes the copy in this tab too.
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey(userId) }));
      },
      removeLocal: userId => this.storage().removeItem(storageKey(userId)),
      merge: mergeStatuses,
    });
  }

  /** With no answer and no copy, the status is not known: `not-started` shows the welcome dialog. */
  public async getStatus(userId: string): Promise<OnboardingStatus> {
    await this.state.whenLoaded();
    const raw = this.storage().getItem(storageKey(userId));
    if (raw === null && this.state.loadFailed()) {
      throw new ScyllaError('The onboarding status is not known', { code: 'UNAVAILABLE' });
    }
    return storedOnboarding.toStatus(raw);
  }

  public saveStatus(userId: string, status: OnboardingStatus): Promise<void> {
    return Promise.resolve().then(() => {
      this.storage().setItem(storageKey(userId), storedOnboarding.toStored(status));
      this.progress.save(status);
    });
  }
}
