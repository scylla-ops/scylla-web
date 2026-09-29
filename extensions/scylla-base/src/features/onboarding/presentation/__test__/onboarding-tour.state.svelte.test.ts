import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { CREATE_PROJECT_MUTATION_KEY } from '@base/features/project';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingStatus } from '../../domain/structs/onboarding-status.struct.ts';
import {
  createOnboardingTourState,
  type OnboardingTourState,
} from '../onboarding-tour.state.svelte.ts';

let teardown: Array<() => void> = [];

const setUp = (stored: OnboardingStatus = { kind: 'not-started' }, canStart = true) => {
  let current = stored;
  const repository = {
    getStatus: vi.fn(() => Promise.resolve(ScyllaResult.success(current))),
    saveStatus: vi.fn((_userId: string, status: OnboardingStatus) => {
      current = status;
      return Promise.resolve(ScyllaResult.success(undefined));
    }),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/agents' });
  const restoreRegistry = withRegistry({ onboarding: { onboardingRepository: repository } });

  let tour!: OnboardingTourState;
  const cleanup = $effect.root(() => {
    tour = createOnboardingTourState(() => canStart);
  });
  flushSync();

  teardown = [cleanup, cache.restore, navigator.restore, restoreRegistry];
  return { tour, repository, navigator, queryClient: cache.queryClient };
};

const onStep = async (tour: OnboardingTourState, id: string) => {
  await vi.waitFor(() => expect(tour.step?.id).toBe(id));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('userId', 'ada');
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme' } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  teardown = [];
});

describe('createOnboardingTourState', () => {
  it('welcomes a user who never saw the tour', async () => {
    const { tour, repository } = setUp();

    await onStep(tour, 'welcome');

    expect(tour.visible).toBe(true);
    expect(repository.getStatus).toHaveBeenCalledWith('ada');
  });

  it('does not start on its own for a user who cannot create an agent and a project', async () => {
    const { tour } = setUp({ kind: 'not-started' }, false);

    await onStep(tour, 'welcome');

    expect(tour.visible).toBe(false);
  });

  it('never shows again once completed or skipped', async () => {
    for (const status of [{ kind: 'completed' }, { kind: 'skipped' }] as const) {
      const { tour, repository } = setUp(status);
      await vi.waitFor(() => expect(repository.getStatus).toHaveBeenCalled());
      flushSync();

      expect(tour.visible).toBe(false);
      teardown.forEach(restore => restore());
      teardown = [];
    }
  });

  it('starts on the dashboard and saves the progress', async () => {
    const { tour, repository, navigator } = setUp();
    await onStep(tour, 'welcome');

    tour.start();

    await onStep(tour, 'dashboard');
    expect(tour.count).toEqual({ step: 1, total: 20 });
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/dashboard', undefined);
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenCalledWith('ada', {
        kind: 'in-progress',
        step: 'dashboard',
      }),
    );
  });

  it('resumes a reloaded tour at its saved step', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'new-project' });

    await onStep(tour, 'new-project');

    expect(tour.visible).toBe(true);
  });

  it('keeps Next disabled until the step unlocks it', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'copy-secret' });
    await onStep(tour, 'copy-secret');

    tour.next();
    flushSync();
    expect(tour.canGoNext).toBe(false);
    expect(tour.step?.id).toBe('copy-secret');

    tour.unlock('copy-secret');
    flushSync();
    tour.next();

    await onStep(tour, 'run-command');
  });

  it('moves once when the same event arrives twice', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'open-agents' });
    await onStep(tour, 'open-agents');

    tour.advance('open-agents');
    tour.advance('open-agents');
    await onStep(tour, 'new-agent');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(tour.step?.id).toBe('new-agent');
  });

  it('asks before skipping, and a skipped tour stays hidden', async () => {
    const { tour, repository } = setUp({ kind: 'in-progress', step: 'navbar' });
    await onStep(tour, 'navbar');

    tour.requestSkip();
    flushSync();
    expect(tour.confirmingSkip).toBe(true);
    expect(repository.saveStatus).not.toHaveBeenCalled();

    tour.cancelSkip();
    flushSync();
    expect(tour.visible).toBe(true);

    tour.requestSkip();
    tour.confirmSkip();

    await vi.waitFor(() => expect(tour.visible).toBe(false));
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenCalledWith('ada', { kind: 'skipped' }),
    );
  });

  it('goes back to the step that opens the dialog the user closed', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'create-agent' });
    await onStep(tour, 'create-agent');

    tour.recover('create-agent');

    await onStep(tour, 'new-agent');
  });

  it('stays on a lost step that has nothing to go back to', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'agent-page' });
    await onStep(tour, 'agent-page');

    tour.recover('agent-page');
    flushSync();

    expect(tour.step?.id).toBe('agent-page');
  });

  it('opens the project the user just created, and points at its New pipeline button', async () => {
    const { tour, navigator, queryClient } = setUp({ kind: 'in-progress', step: 'create-project' });
    await onStep(tour, 'create-project');

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: CREATE_PROJECT_MUTATION_KEY,
        mutationFn: () => Promise.resolve({ id: 'project-9', name: 'web' }),
      })
      .execute({});

    await onStep(tour, 'new-pipeline');
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/project-9', undefined);
  });

  it('ignores the writes that are not the one the step waits for', async () => {
    const { tour, queryClient } = setUp({ kind: 'in-progress', step: 'create-project' });
    await onStep(tour, 'create-project');

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: ['project', 'update'],
        mutationFn: () => Promise.resolve({ id: 'project-9', name: 'web' }),
      })
      .execute({});
    flushSync();

    expect(tour.step?.id).toBe('create-project');
  });

  it('remembers the pipeline it ran, to follow its job', async () => {
    const { tour, queryClient } = setUp({
      kind: 'in-progress',
      step: 'run-pipeline',
      subject: { pipelineName: 'my-pipeline' },
    });
    await onStep(tour, 'run-pipeline');

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: ['pipeline', 'run'],
        mutationFn: () => Promise.resolve(undefined),
      })
      .execute('pipeline-7');

    await onStep(tour, 'wait-job');
    expect(tour.subject).toEqual({ pipelineName: 'my-pipeline', pipelineId: 'pipeline-7' });
  });

  it('shows the final screen after the last step, and completes on Finish', async () => {
    const { tour, repository } = setUp({ kind: 'in-progress', step: 'job-details' });
    await onStep(tour, 'job-details');

    tour.next();
    await onStep(tour, 'finish');

    tour.finish();

    await vi.waitFor(() => expect(tour.visible).toBe(false));
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenLastCalledWith('ada', { kind: 'completed' }),
    );
  });
});
