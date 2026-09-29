import type { ScyllaModule } from '@scylla/core-sdk';
import { BrowserOnboardingLocalDataSource } from '@base/features/onboarding/infrastructure/data/browser-onboarding-local.data-source.ts';
import { DefaultOnboardingRepository } from '@base/features/onboarding/infrastructure/repository/default-onboarding.repository.ts';

const onboardingRepository = new DefaultOnboardingRepository(
  new BrowserOnboardingLocalDataSource(),
);

export const OnboardingModule = {
  id: 'onboarding',
  domain: {
    onboardingRepository: onboardingRepository,
  },
} satisfies ScyllaModule;
