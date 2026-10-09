import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import { agentQueries, CREATE_AGENT_MUTATION_KEY } from '@base/features/agents';
import { contextStore, scyllaNavigate } from '@platform/context';
import { toRune } from '@scylla/ui/stores';
import type {
  OnboardingStatus,
  OnboardingSubject,
} from '../domain/structs/onboarding-status.struct.ts';
import { onboardingMutations, onboardingQueries } from './onboarding.queries.ts';
import {
  advanceTour,
  currentStepId,
  isAgentOffline,
  isTourVisible,
  rememberSubject,
  rewindTour,
  sameMutationKey,
  stepCount,
} from './tour-machine.calculator.ts';
import { TOUR_STEPS, type TourStep } from './tour-steps.ts';

const STEP_IDS = TOUR_STEPS.map(step => step.id);
const SPOT_STEP_IDS = TOUR_STEPS.filter(step => step.kind === 'spot').map(step => step.id);

const createdAgentId = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null || !('agent' in data)) return undefined;
  const { agent } = data;
  return typeof agent === 'object' &&
    agent !== null &&
    'id' in agent &&
    typeof agent.id === 'string'
    ? agent.id
    : undefined;
};

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
  const context = toRune(contextStore);
  const needsAgent = $derived(visible && step?.kind === 'spot' && !!step.needsAgent);
  const agentsQuery = createQuery(() => {
    const options = agentQueries.byOrganization(context().organization.id ?? '');
    return { ...options, enabled: options.enabled !== false && needsAgent };
  });
  const agentOffline = $derived(needsAgent && isAgentOffline(agentsQuery.data, subject.agentId));

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
        const { mutation } = event;
        if (sameMutationKey(mutation.options.mutationKey, CREATE_AGENT_MUTATION_KEY)) {
          const agentId = createdAgentId(mutation.state.data);
          if (status && agentId) write(rememberSubject(status, { agentId }));
          return;
        }
        const current = step;
        if (current?.kind !== 'spot' || current.advance.on !== 'mutation') return;

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
    get agentOffline() {
      return agentOffline;
    },
    get canGoBack() {
      return step?.kind === 'spot' && !!step.page;
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
    goBack() {
      if (step?.kind !== 'spot' || !step.page) return;
      scyllaNavigate.goToOrgRoute(step.page(subject));
    },
    openAgent() {
      scyllaNavigate.goToOrgRoute(subject.agentId ? `/agents/${subject.agentId}` : '/agents');
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
