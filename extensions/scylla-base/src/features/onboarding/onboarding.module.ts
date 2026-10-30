import type { ScyllaModule } from '@scylla/core-sdk';
import { DefaultOnboardingRepository } from './infrastructure/default-onboarding.repository.ts';

const onboardingRepository = new DefaultOnboardingRepository();

export const OnboardingModule = {
  id: 'onboarding',
  domain: {
    onboardingRepository: onboardingRepository,
  },
} satisfies ScyllaModule;
