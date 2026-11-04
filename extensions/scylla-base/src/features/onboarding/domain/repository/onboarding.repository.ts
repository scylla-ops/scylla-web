import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';

export interface OnboardingRepository {
  getStatus(userId: string): Promise<OnboardingStatus>;
  saveStatus(userId: string, status: OnboardingStatus): Promise<void>;
}
