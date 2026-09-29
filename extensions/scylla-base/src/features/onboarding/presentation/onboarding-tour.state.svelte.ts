import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import { scyllaNavigate } from '@platform/context';
import type {
  OnboardingStatus,
  OnboardingSubject,
} from '../domain/structs/onboarding-status.struct.ts';
import { onboardingMutations, onboardingQueries } from './onboarding.queries.ts';
import {
  advanceTour,
  currentStepId,
  isTourVisible,
  rewindTour,
  sameMutationKey,
  stepCount,
} from './tour-machine.calculator.ts';
import { TOUR_STEPS, type TourStep } from './tour-steps.ts';

const STEP_IDS = TOUR_STEPS.map(step => step.id);
const SPOT_STEP_IDS = TOUR_STEPS.filter(step => step.kind === 'spot').map(step => step.id);

const currentUserId = () => localStorage.getItem('userId') || 'anonymous';

export const createOnboardingTourState = (canStart: () => boolean) => {
  const userId = currentUserId();

  const statusQuery = createQuery(() => onboardingQueries.status(userId));
  const save = createMutation(() => onboardingMutations.save(userId));

  let confirmingSkip = $state(false);
  let unlockedStepId = $state<string | null>(null);

  const status = $derived(statusQuery.data);
  const step = $derived.by((): TourStep | null => {
    if (!status) return null;
    const id = currentStepId(status, STEP_IDS);
    return TOUR_STEPS.find(candidate => candidate.id === id) ?? null;
  });
  const visible = $derived(!!status && !!step && isTourVisible(status, canStart()));
  const subject = $derived<OnboardingSubject>(
    status?.kind === 'in-progress' ? (status.subject ?? {}) : {},
  );
  const canGoNext = $derived(
    step?.kind === 'spot' && (!step.nextWhen || unlockedStepId === step.id),
  );

  const write = (next: OnboardingStatus | null) => {
    if (next) save.mutate(next);
  };

  const advanceFrom = (stepId: string, found?: OnboardingSubject) => {
    if (status) write(advanceTour(status, STEP_IDS, stepId, found));
  };

  const followMutations = () =>
    getQueryClient()
      .getMutationCache()
      .subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'success') return;
        const current = step;
        if (current?.kind !== 'spot' || current.advance.on !== 'mutation') return;

        const { mutation } = event;
        if (!sameMutationKey(mutation.options.mutationKey, current.advance.key)) return;
        const found = current.advance.onSuccess?.(mutation.state.data, mutation.state.variables);
        advanceFrom(current.id, found);
      });

  $effect(followMutations);

  return {
    get visible() {
      return visible;
    },
    get step() {
      return step;
    },
    get subject() {
      return subject;
    },
    get confirmingSkip() {
      return confirmingSkip;
    },
    get count() {
      return step ? stepCount(SPOT_STEP_IDS, step.id) : null;
    },
    get canGoNext() {
      return canGoNext;
    },

    start() {
      if (step?.kind !== 'welcome') return;
      advanceFrom(step.id);
      scyllaNavigate.goToOrgRoute('/dashboard');
    },
    next() {
      if (step?.kind === 'spot' && canGoNext) advanceFrom(step.id);
    },
    advance(stepId: string) {
      advanceFrom(stepId);
    },
    unlock(stepId: string) {
      unlockedStepId = stepId;
    },
    recover(stepId: string) {
      const current = TOUR_STEPS.find(candidate => candidate.id === stepId);
      if (!status || current?.kind !== 'spot' || !current.fallback) return;
      write(rewindTour(status, STEP_IDS, stepId, current.fallback));
    },
    requestSkip() {
      confirmingSkip = true;
    },
    cancelSkip() {
      confirmingSkip = false;
    },
    confirmSkip() {
      confirmingSkip = false;
      write({ kind: 'skipped' });
    },
    finish() {
      if (step?.kind === 'finish') write({ kind: 'completed' });
    },
  };
};

export type OnboardingTourState = ReturnType<typeof createOnboardingTourState>;
