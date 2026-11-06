import {
  declinedTours,
  doneTours,
  type OnboardingStatus,
  type OnboardingSubject,
} from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';

export type TourView = 'none' | 'intro' | 'spot' | 'finish';

/** What the overlay shows: the welcome dialog, a step of a tour, the end of a tour, or nothing. */
export const tourView = (
  status: OnboardingStatus,
  hasStep: boolean,
  canStart: boolean,
): TourView => {
  switch (status.kind) {
    case 'not-started':
      return canStart ? 'intro' : 'none';
    case 'in-progress':
      return hasStep ? 'spot' : 'none';
    case 'finished':
      return 'finish';
    default:
      return 'none';
  }
};

export const stepCount = (
  stepIds: readonly string[],
  stepId: string,
): { step: number; total: number } | null => {
  const index = stepIds.indexOf(stepId);
  return index === -1 ? null : { step: index + 1, total: stepIds.length };
};

/** No agent to wait for is not "offline": the step goes on as without the check. */
export const isAgentOffline = (
  agents: readonly { id: string; connected: boolean }[] | undefined,
  agentId: string | undefined,
): boolean => {
  if (!agents || agents.length === 0) return false;
  const watched = agentId ? agents.filter(agent => agent.id === agentId) : agents;
  if (watched.length === 0) return false;
  return !watched.some(agent => agent.connected);
};

interface OfferableTour<P> {
  id: string;
  permissions: readonly P[];
  offer?: { path: RegExp; subject?: (match: RegExpMatchArray) => OnboardingSubject };
}

/** The path in the workspace: the URL without the slug of the workspace. */
export const workspacePath = (pathname: string): string => pathname.replace(/^\/[^/]+/, '') || '/';

/**
 * The tour that the current page offers on a first visit: one the user may start, has not done
 * and has not turned down. Nothing while a tour runs or its end shows.
 */
export const offeredTour = <T extends OfferableTour<P>, P>(
  tours: readonly T[],
  pathname: string,
  status: OnboardingStatus,
  can: (permission: P) => boolean,
): { tour: T; subject: OnboardingSubject } | undefined => {
  if (status.kind === 'in-progress' || status.kind === 'finished') return undefined;
  const seen = [...doneTours(status), ...declinedTours(status)];
  const path = workspacePath(pathname);
  for (const tour of tours) {
    const match = tour.offer ? path.match(tour.offer.path) : null;
    if (!match || seen.includes(tour.id) || !tour.permissions.every(can)) continue;
    return { tour, subject: tour.offer?.subject?.(match) ?? {} };
  }
  return undefined;
};
