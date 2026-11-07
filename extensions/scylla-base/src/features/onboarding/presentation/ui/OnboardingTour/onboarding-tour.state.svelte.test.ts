import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { CREATE_APP_MUTATION_KEY } from '@base/features/apps';
import { CREATE_PROJECT_MUTATION_KEY } from '@base/features/project';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import { createOnboardingTour, type OnboardingTour } from './onboarding-tour.state.svelte.ts';

let teardown: Array<() => void> = [];

let agents: { id: string; connected: boolean }[] = [];
const listAgents = vi.fn(() => Promise.resolve(agents));

const setUp = (stored: OnboardingStatus = { kind: 'not-started' }, canStart = true) => {
  let current = stored;
  const repository = {
    getStatus: vi.fn(() => Promise.resolve(current)),
    saveStatus: vi.fn((_userId: string, status: OnboardingStatus) => {
      current = status;
      return Promise.resolve(undefined);
    }),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/agents' });
  const restoreRegistry = withRegistry({
    onboarding: { onboardingRepository: repository },
    apps: { appsRepository: { listApps: listAgents } },
  });

  let tour!: OnboardingTour;
  const cleanup = $effect.root(() => {
    tour = createOnboardingTour(() => canStart);
  });
  flushSync();

  teardown = [cleanup, cache.restore, navigator.restore, restoreRegistry];
  return { tour, repository, navigator, queryClient: cache.queryClient };
};

const onStep = async (tour: OnboardingTour, id: string) => {
  await vi.waitFor(() => expect(tour.step?.id).toBe(id));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('userId', 'ada');
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: null } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  teardown = [];
  agents = [];
  listAgents.mockClear();
  permissionsStore.setState({ permissions: null });
});

const grantListAgents = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: { kind: 'restricted', permissions: [Permission.LIST_AGENTS] },
        },
      ],
    },
  });

describe('createOnboardingTour', () => {
  it('welcomes a user who never saw the tour with the key features', async () => {
    const { tour, repository } = setUp();

    await vi.waitFor(() => expect(tour.view).toBe('intro'));
    expect(repository.getStatus).toHaveBeenCalledWith('ada');
  });

  it('stays hidden and saves nothing for a user who cannot create an agent and a project', async () => {
    const { tour, repository } = setUp({ kind: 'not-started' }, false);

    await vi.waitFor(() => expect(repository.getStatus).toHaveBeenCalled());
    flushSync();

    expect(tour.view).toBe('none');
    expect(repository.saveStatus).not.toHaveBeenCalled();
  });

  it('never shows again once completed or skipped', async () => {
    for (const status of [{ kind: 'completed' }, { kind: 'skipped' }] as const) {
      const { tour, repository } = setUp(status);
      await vi.waitFor(() => expect(repository.getStatus).toHaveBeenCalled());
      flushSync();

      expect(tour.view).toBe('none');
      teardown.forEach(restore => restore());
      teardown = [];
    }
  });

  it('starts the chosen tour at its first step and saves it', async () => {
    const { tour, repository } = setUp();
    await vi.waitFor(() => expect(tour.view).toBe('intro'));

    tour.startTour('agent');

    await onStep(tour, 'open-agents');
    expect(tour.view).toBe('spot');
    expect(tour.count).toEqual({ step: 1, total: 5 });
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenCalledWith('ada', {
        kind: 'in-progress',
        tour: 'agent',
        step: 'open-agents',
      }),
    );
  });

  it('opens the page of a tour that starts on one', async () => {
    const { tour, navigator } = setUp({ kind: 'completed', subject: { projectId: 'p-1' } });
    await vi.waitFor(() => expect(tour.view).toBe('none'));

    tour.startTour('run');

    await onStep(tour, 'run-project');
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/p-1', undefined);
  });

  it('keeps every tour short', async () => {
    for (const id of ['agent', 'pipeline', 'run', 'triggers', 'secrets', 'roles', 'users']) {
      const { tour } = setUp({ kind: 'in-progress', tour: id, step: 'none' });
      await vi.waitFor(() => expect(tour.tour?.id).toBe(id));
      expect(tour.tour?.steps.length).toBeLessThanOrEqual(6);
      teardown.forEach(restore => restore());
      teardown = [];
    }
  });

  it('resumes a reloaded tour at its saved step', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'pipeline', step: 'new-project' });

    await onStep(tour, 'new-project');

    expect(tour.view).toBe('spot');
    expect(tour.count).toEqual({ step: 2, total: 6 });
  });

  it('resumes a tour saved before the tours, in the tour that holds its step', async () => {
    const { tour } = setUp({ kind: 'in-progress', step: 'connect-agent' });

    await onStep(tour, 'agent-page');

    expect(tour.tour?.id).toBe('agent');
  });

  it('keeps Next disabled until the step unlocks it', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'run', step: 'wait-job' });
    await onStep(tour, 'wait-job');

    tour.next();
    flushSync();
    expect(tour.canGoNext).toBe(false);
    expect(tour.step?.id).toBe('wait-job');

    tour.unlock('wait-job');
    flushSync();
    tour.next();

    await onStep(tour, 'open-job');
  });

  it('moves once when the same event arrives twice', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'agent', step: 'open-agents' });
    await onStep(tour, 'open-agents');

    tour.advance('open-agents');
    tour.advance('open-agents');
    await onStep(tour, 'new-agent');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(tour.step?.id).toBe('new-agent');
  });

  it('goes back one step, and opens its page', async () => {
    const { tour, navigator } = setUp({
      kind: 'in-progress',
      tour: 'pipeline',
      step: 'create-pipeline',
      subject: { projectId: 'p-1' },
    });
    await onStep(tour, 'create-pipeline');
    expect(tour.canGoPrevious).toBe(true);

    tour.previous();

    await onStep(tour, 'new-pipeline');
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/p-1', undefined);
    expect(tour.rewound).toBe(true);
  });

  it('opens the page of a step in the menu with Go, and moves on', async () => {
    const { tour, navigator } = setUp({ kind: 'in-progress', tour: 'roles', step: 'open-roles' });
    await onStep(tour, 'open-roles');

    tour.go();

    await onStep(tour, 'built-in-roles');
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/access/roles', undefined);
  });

  it('goes back to the page that the user left, for a step with no page', async () => {
    const { tour, navigator } = setUp({ kind: 'in-progress', tour: 'roles', step: 'open-roles' });
    await onStep(tour, 'open-roles');
    tour.go();
    await onStep(tour, 'built-in-roles');

    tour.previous();

    await onStep(tour, 'open-roles');
    expect(navigator.navigate).toHaveBeenLastCalledWith('/acme/agents', undefined);
  });

  it('has no previous step at the start of a tour', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'agent', step: 'open-agents' });
    await onStep(tour, 'open-agents');

    expect(tour.canGoPrevious).toBe(false);
  });

  it('asks before skipping, and a skipped tour stays hidden', async () => {
    const { tour, repository } = setUp({
      kind: 'in-progress',
      tour: 'agent',
      step: 'new-agent',
      done: ['run'],
    });
    await onStep(tour, 'new-agent');

    tour.requestSkip();
    flushSync();
    expect(tour.confirmingSkip).toBe(true);
    expect(repository.saveStatus).not.toHaveBeenCalled();

    tour.cancelSkip();
    flushSync();
    expect(tour.view).toBe('spot');

    tour.requestSkip();
    tour.confirmSkip();

    await vi.waitFor(() => expect(tour.view).toBe('none'));
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenCalledWith('ada', { kind: 'skipped', done: ['run'] }),
    );
  });

  it('closes the welcome dialog for good when the user explores alone', async () => {
    const { tour, repository } = setUp();
    await vi.waitFor(() => expect(tour.view).toBe('intro'));

    tour.skipIntro();

    await vi.waitFor(() => expect(tour.view).toBe('none'));
    expect(repository.saveStatus).toHaveBeenCalledWith('ada', { kind: 'skipped' });
  });

  it('goes back to the step that opens the dialog the user closed', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'agent', step: 'create-agent' });
    await onStep(tour, 'create-agent');

    tour.recover('create-agent');

    await onStep(tour, 'new-agent');
  });

  it('does not rewind while the user is only on another page', async () => {
    const { tour, repository } = setUp({
      kind: 'in-progress',
      tour: 'pipeline',
      step: 'create-project',
    });
    await onStep(tour, 'create-project');
    expect(tour.onStepPage).toBe(false);

    tour.recover('create-project');
    flushSync();

    expect(tour.step?.id).toBe('create-project');
    expect(repository.saveStatus).not.toHaveBeenCalled();
  });

  it('rewinds the install step to the agent that exists', async () => {
    const { tour } = setUp({
      kind: 'in-progress',
      tour: 'agent',
      step: 'run-command',
      subject: { agentId: 'a-1' },
    });
    await onStep(tour, 'run-command');

    tour.recover('run-command');

    await onStep(tour, 'agent-page');
  });

  it('has no way back from the install step, whose join code would be lost', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'agent', step: 'run-command' });
    await onStep(tour, 'run-command');

    expect(tour.canGoPrevious).toBe(false);
    tour.previous();
    flushSync();

    expect(tour.step?.id).toBe('run-command');
  });

  it('goes back to the step that opens a dialog, not to the dialog that is gone', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'secrets', step: 'use-secret' });
    await onStep(tour, 'use-secret');

    tour.previous();

    await onStep(tour, 'new-secret');
  });

  it('locks Next again when the condition stops holding', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'roles', step: 'role-details' });
    await onStep(tour, 'role-details');

    tour.unlock('role-details');
    flushSync();
    expect(tour.canGoNext).toBe(true);

    tour.lock('role-details');
    flushSync();
    expect(tour.canGoNext).toBe(false);
  });

  it('reads the status again when another tab changes it', async () => {
    const { tour, repository } = setUp({ kind: 'in-progress', tour: 'agent', step: 'new-agent' });
    await onStep(tour, 'new-agent');
    void repository.saveStatus('ada', { kind: 'in-progress', tour: 'agent', step: 'create-agent' });

    window.dispatchEvent(new StorageEvent('storage', { key: 'onboarding:ada' }));

    await onStep(tour, 'create-agent');
  });

  it('stays on a lost step that has nothing to go back to', async () => {
    const { tour } = setUp({ kind: 'in-progress', tour: 'agent', step: 'agent-page' });
    await onStep(tour, 'agent-page');

    tour.recover('agent-page');
    flushSync();

    expect(tour.step?.id).toBe('agent-page');
  });

  it('points at the project the user just created instead of opening it', async () => {
    const { tour, navigator, queryClient } = setUp({
      kind: 'in-progress',
      tour: 'pipeline',
      step: 'create-project',
    });
    await onStep(tour, 'create-project');

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: CREATE_PROJECT_MUTATION_KEY,
        mutationFn: () => Promise.resolve({ id: 'project-9', name: 'web' }),
      })
      .execute({});

    await onStep(tour, 'open-project');
    expect(tour.subject).toEqual({ projectId: 'project-9' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('ignores the writes that are not the one the step waits for', async () => {
    const { tour, queryClient } = setUp({
      kind: 'in-progress',
      tour: 'pipeline',
      step: 'create-project',
    });
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
      tour: 'run',
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

  it('shows the end of the tour after its last step, and completes on Finish', async () => {
    const { tour, repository } = setUp({ kind: 'in-progress', tour: 'run', step: 'job-details' });
    await onStep(tour, 'job-details');
    expect(tour.isLastStep).toBe(true);

    tour.next();
    await vi.waitFor(() => expect(tour.view).toBe('finish'));
    expect(tour.done).toEqual(['run']);

    tour.finish();

    await vi.waitFor(() => expect(tour.view).toBe('none'));
    await vi.waitFor(() =>
      expect(repository.saveStatus).toHaveBeenLastCalledWith('ada', {
        kind: 'completed',
        done: ['run'],
      }),
    );
  });

  it('starts the next tour from the end of the previous one', async () => {
    const { tour } = setUp({
      kind: 'finished',
      tour: 'agent',
      done: ['agent'],
      subject: { agentId: 'a-1' },
    });
    await vi.waitFor(() => expect(tour.view).toBe('finish'));

    tour.startTour('pipeline');

    await onStep(tour, 'open-projects');
    expect(tour.subject).toEqual({ agentId: 'a-1' });
    expect(tour.done).toEqual(['agent']);
  });

  it('remembers the agent the user creates, to watch it later', async () => {
    const { tour, queryClient } = setUp({
      kind: 'in-progress',
      tour: 'agent',
      step: 'create-agent',
    });
    await onStep(tour, 'create-agent');

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: CREATE_APP_MUTATION_KEY,
        mutationFn: () =>
          Promise.resolve({ app: { id: 'agent-7' }, joinCode: { code: 'c', expiresAt: '' } }),
      })
      .execute('runner');

    await vi.waitFor(() => expect(tour.subject).toEqual({ agentId: 'agent-7' }));
    expect(tour.step?.id).toBe('create-agent');
  });

  it('says so when the agent of the tour is offline at a step that needs it, and recovers', async () => {
    grantListAgents();
    agents = [{ id: 'agent-7', connected: false }];
    const { tour, queryClient } = setUp({
      kind: 'in-progress',
      tour: 'run',
      step: 'wait-job',
      subject: { agentId: 'agent-7' },
    });
    await onStep(tour, 'wait-job');

    await vi.waitFor(() => expect(tour.agentOffline).toBe(true));

    agents = [{ id: 'agent-7', connected: true }];
    await queryClient.invalidateQueries({ queryKey: ['apps'] });

    await vi.waitFor(() => expect(tour.agentOffline).toBe(false));
  });

  it('does not watch the agents at a step that does not need one', async () => {
    grantListAgents();
    agents = [{ id: 'agent-7', connected: false }];
    const { tour } = setUp({ kind: 'in-progress', tour: 'pipeline', step: 'new-project' });
    await onStep(tour, 'new-project');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(tour.agentOffline).toBe(false);
    expect(listAgents).not.toHaveBeenCalled();
  });

  it('opens the page of a lost step when the user asks to go back', async () => {
    const { tour, navigator } = setUp({
      kind: 'in-progress',
      tour: 'pipeline',
      step: 'create-pipeline',
      subject: { projectId: 'p-1' },
    });
    await onStep(tour, 'create-pipeline');

    expect(tour.canGoBack).toBe(true);
    tour.goBack();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/p-1/create', undefined);
  });

  it('opens the agent of the tour from the offline notice', async () => {
    const { tour, navigator } = setUp({
      kind: 'in-progress',
      tour: 'run',
      step: 'run-pipeline',
      subject: { agentId: 'agent-7' },
    });
    await onStep(tour, 'run-pipeline');

    tour.openAgent();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/agents/agent-7', undefined);
  });
});
