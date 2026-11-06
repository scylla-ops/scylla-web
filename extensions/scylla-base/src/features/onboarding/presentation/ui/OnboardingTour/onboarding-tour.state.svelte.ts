import { SvelteMap } from 'svelte/reactivity';
import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import { appQueries, CREATE_APP_MUTATION_KEY } from '@base/features/apps';
import { contextStore, currentPathname, navigateTo, scyllaNavigate } from '@platform/context';
import { toRune } from '@scylla/ui/stores';
import {
  advanceTour,
  closeTours,
  currentStepId,
  declineTour,
  doneTours,
  previousStepId,
  rememberSubject,
  reopenIntro,
  rewindTour,
  savedStepId,
  startTour,
  type OnboardingStatus,
  type OnboardingSubject,
} from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import {
  onboardingMutations,
  onboardingQueries,
} from '@base/features/onboarding/presentation/onboarding.queries.ts';
import {
  isAgentOffline,
  stepCount,
  tourView,
} from '@base/features/onboarding/presentation/presenters/tour.presenter.ts';
import {
  findTour,
  tourOfStep,
  type TourDefinition,
  type TourSpotStep,
} from './tour-steps.registry.ts';

const sameMutationKey = (
  key: readonly unknown[] | undefined,
  expected: readonly unknown[],
): boolean => !!key && JSON.stringify(key) === JSON.stringify(expected);

const createdAgentId = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null || !('app' in data)) return undefined;
  const { app } = data;
  return typeof app === 'object' && app !== null && 'id' in app && typeof app.id === 'string'
    ? app.id
    : undefined;
};

const stepIdsOf = (tour: TourDefinition | undefined) => tour?.steps.map(step => step.id) ?? [];

export const currentUserId = () => localStorage.getItem('userId') || 'anonymous';

/** Starts a tour from anywhere in the app (the help page): the overlay reads the same status. */
export const createTourLauncher = () => {
  const userId = currentUserId();
  const statusQuery = createQuery(() => onboardingQueries.status(userId));
  const save = createMutation(() => onboardingMutations.save(userId));

  return {
    get done() {
      return statusQuery.data ? doneTours(statusQuery.data) : [];
    },
    get activeTour() {
      const status = statusQuery.data;
      if (status?.kind !== 'in-progress') return undefined;
      return (findTour(status.tour) ?? tourOfStep(savedStepId(status)))?.id;
    },
    /** From `entry`, the tour starts on the page that offered it, at its step there. */
    start(tourId: string, entry?: { step: string; subject: OnboardingSubject }) {
      const tour = findTour(tourId);
      const first = entry ? tour?.steps.find(step => step.id === entry.step) : tour?.steps[0];
      if (!tour || !first) return;
      const status = statusQuery.data ?? { kind: 'not-started' as const };
      save.mutate(startTour(status, tour.id, first.id, entry?.subject));
      const subject = status.kind === 'not-started' ? {} : (status.subject ?? {});
      if (!entry && first.page) scyllaNavigate.goToWorkspaceRoute(first.page(subject));
    },
    decline(tourId: string) {
      const next = statusQuery.data ? declineTour(statusQuery.data, tourId) : null;
      if (next) save.mutate(next);
    },
    reopenIntro() {
      save.mutate(reopenIntro(statusQuery.data ?? { kind: 'not-started' }));
    },
  };
};

export const createOnboardingTour = (canStart: () => boolean) => {
  const userId = currentUserId();

  const statusQuery = createQuery(() => onboardingQueries.status(userId));
  const save = createMutation(() => onboardingMutations.save(userId));
  const launcher = createTourLauncher();

  let confirmingSkip = $state(false);
  let unlockedStepId = $state<string | null>(null);

  const status = $derived(statusQuery.data);
  const tour = $derived.by((): TourDefinition | undefined => {
    if (status?.kind === 'in-progress') {
      return findTour(status.tour) ?? tourOfStep(savedStepId(status));
    }
    if (status?.kind === 'finished') return findTour(status.tour);
    return undefined;
  });
  const stepIds = $derived(stepIdsOf(tour));
  const step = $derived.by((): TourSpotStep | null => {
    if (!status || !tour) return null;
    const id = currentStepId(status, stepIds);
    return tour.steps.find(candidate => candidate.id === id) ?? null;
  });
  const view = $derived(status ? tourView(status, !!step, canStart()) : 'none');
  const subject = $derived<OnboardingSubject>(
    status && status.kind !== 'not-started' ? (status.subject ?? {}) : {},
  );
  const context = toRune(contextStore);
  const needsAgent = $derived(view === 'spot' && !!step?.needsAgent);
  const agentsQuery = createQuery(() => {
    const options = appQueries.runners(context().workspace.id ?? '');
    return { ...options, enabled: options.enabled !== false && needsAgent };
  });
  const agentOffline = $derived(needsAgent && isAgentOffline(agentsQuery.data, subject.agentId));

  const canGoNext = $derived(!!step && (!step.nextWhen || unlockedStepId === step.id));

  const left = new SvelteMap<string, string>();

  const write = (next: OnboardingStatus | null) => {
    if (next) save.mutate(next);
  };

  const advanceFrom = (stepId: string, found?: OnboardingSubject) => {
    if (!status) return;
    const next = advanceTour(status, stepIds, stepId, found);
    if (next) left.set(stepId, currentPathname());
    write(next);
  };

  const followMutations = () =>
    getQueryClient()
      .getMutationCache()
      .subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'success') return;
        const { mutation } = event;
        if (sameMutationKey(mutation.options.mutationKey, CREATE_APP_MUTATION_KEY)) {
          const agentId = createdAgentId(mutation.state.data);
          if (status && agentId) write(rememberSubject(status, { agentId }));
          return;
        }
        const current = step;
        if (current?.advance.on !== 'mutation') return;

        if (!sameMutationKey(mutation.options.mutationKey, current.advance.key)) return;
        const found = current.advance.onSuccess?.(mutation.state.data, mutation.state.variables);
        advanceFrom(current.id, found);
      });

  $effect(followMutations);

  return {
    get view() {
      return view;
    },
    get tour() {
      return tour;
    },
    get step() {
      return step;
    },
    get subject() {
      return subject;
    },
    get done() {
      return status ? doneTours(status) : [];
    },
    get status() {
      return status;
    },
    get confirmingSkip() {
      return confirmingSkip;
    },
    get count() {
      return step ? stepCount(stepIds, step.id) : null;
    },
    get isLastStep() {
      return !!step && stepIds[stepIds.length - 1] === step.id;
    },
    get canGoNext() {
      return canGoNext;
    },
    get canGoPrevious() {
      return !!step && previousStepId(stepIds, step.id) !== null;
    },
    get agentOffline() {
      return agentOffline;
    },
    get canGoBack() {
      return !!step?.page;
    },

    startTour(tourId: string) {
      launcher.start(tourId);
    },
    startOffer(tourId: string, step: string, found: OnboardingSubject) {
      launcher.start(tourId, { step, subject: found });
    },
    declineOffer(tourId: string) {
      launcher.decline(tourId);
    },
    next() {
      if (step && canGoNext) advanceFrom(step.id);
    },
    previous() {
      if (!status || !step || !tour) return;
      const to = previousStepId(stepIds, step.id);
      const target = tour.steps.find(candidate => candidate.id === to);
      if (!to || !target) return;
      write(rewindTour(status, stepIds, step.id, to));
      const before = left.get(to);
      if (target.page) scyllaNavigate.goToWorkspaceRoute(target.page(subject));
      else if (before) navigateTo(before);
    },
    /** Opens the page that the click in the menu would open, and moves on. */
    go() {
      if (!step?.go) return;
      const page = step.go(subject);
      advanceFrom(step.id);
      scyllaNavigate.goToWorkspaceRoute(page);
    },
    advance(stepId: string, found?: OnboardingSubject) {
      advanceFrom(stepId, found);
    },
    unlock(stepId: string) {
      unlockedStepId = stepId;
    },
    recover(stepId: string) {
      const current = tour?.steps.find(candidate => candidate.id === stepId);
      if (!status || !current?.fallback) return;
      write(rewindTour(status, stepIds, stepId, current.fallback));
    },
    goBack() {
      if (!step?.page) return;
      scyllaNavigate.goToWorkspaceRoute(step.page(subject));
    },
    openAgent() {
      scyllaNavigate.goToWorkspaceRoute(subject.agentId ? `/agents/${subject.agentId}` : '/agents');
    },
    requestSkip() {
      confirmingSkip = true;
    },
    cancelSkip() {
      confirmingSkip = false;
    },
    confirmSkip() {
      confirmingSkip = false;
      if (status) write(closeTours(status, 'skipped'));
    },
    skipIntro() {
      if (status) write(closeTours(status, 'skipped'));
    },
    finish() {
      if (status?.kind === 'finished') write(closeTours(status, 'completed'));
    },
  };
};

export type OnboardingTour = ReturnType<typeof createOnboardingTour>;
