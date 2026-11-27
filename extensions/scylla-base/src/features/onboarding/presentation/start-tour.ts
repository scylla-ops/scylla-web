import { getQueryClient } from '@scylla/core-sdk';
import { startTour } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import { onboardingMutations, onboardingQueries } from './onboarding.queries.ts';
import { currentUserId } from './ui/OnboardingTour/onboarding-tour.state.svelte.ts';
import { findTour } from './ui/OnboardingTour/tour-steps.registry.ts';

/** Starts a tour at its first step, on the page where the user is: the overlay reads the status. */
export const startTourById = async (tourId: string): Promise<void> => {
  const first = findTour(tourId)?.steps[0];
  if (!first) return;
  const client = getQueryClient();
  const userId = currentUserId();
  const status = await client.ensureQueryData(onboardingQueries.status(userId));
  const next = startTour(status, tourId, first.id);
  await client.getMutationCache().build(client, onboardingMutations.save(userId)).execute(next);
};
