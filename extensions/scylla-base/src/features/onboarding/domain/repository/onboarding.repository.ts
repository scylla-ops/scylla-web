import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';

export interface OnboardingRepository {
  getStatus(userId: string): Promise<ScyllaResult<OnboardingStatus>>;
  saveStatus(userId: string, status: OnboardingStatus): Promise<ScyllaResult<void>>;
}
