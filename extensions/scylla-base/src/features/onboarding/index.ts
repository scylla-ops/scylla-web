export const loadOnboardingTour = () =>
  import('./presentation/ui/OnboardingTour/OnboardingTour.svelte');

/** Starts a guided tour from anywhere, for example from the notes of a release. */
export const startTourById = (tourId: string) =>
  import('./presentation/start-tour.ts').then(({ startTourById: start }) => start(tourId));
