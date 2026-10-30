import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { OnboardingStatus } from '../domain/structs/onboarding-status.struct.ts';
import type { OnboardingModule } from '../onboarding.module.ts';

const repository = () =>
  getModuleDomain<typeof OnboardingModule.domain>('onboarding').onboardingRepository;

export const ONBOARDING_QUERY_KEY = (userId: string) => ['onboarding', userId] as const;

export const onboardingQueries = {
  status: (userId: string) =>
    queryOptions<OnboardingStatus>({
      queryKey: ONBOARDING_QUERY_KEY(userId),
      queryFn: () => repository().getStatus(userId),
      staleTime: Infinity,
    }),
};

export const onboardingMutations = {
  save: (userId: string) =>
    mutationOptions({
      mutationFn: (status: OnboardingStatus) => repository().saveStatus(userId, status),
      onMutate: (status: OnboardingStatus) => {
        getQueryClient().setQueryData(ONBOARDING_QUERY_KEY(userId), status);
      },
    }),
};
