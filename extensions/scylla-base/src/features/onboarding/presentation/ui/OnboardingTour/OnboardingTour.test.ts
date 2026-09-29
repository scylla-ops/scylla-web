import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingStatus } from '../../../domain/structs/onboarding-status.struct.ts';
import OnboardingTour from './OnboardingTour.svelte';

let teardown: Array<() => void> = [];

const grant = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

const setUp = (stored: OnboardingStatus = { kind: 'not-started' }) => {
  const saveStatus = vi.fn((_userId: string, _status: OnboardingStatus) =>
    Promise.resolve(ScyllaResult.success(undefined)),
  );
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/dashboard' });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      onboarding: {
        onboardingRepository: {
          getStatus: () => Promise.resolve(ScyllaResult.success(stored)),
          saveStatus,
        },
      },
    }),
  ];
  render(OnboardingTour);
  return { saveStatus };
};

beforeEach(() => {
  localStorage.clear();
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme' } });
  grant(Permission.CREATE_AGENT, Permission.CREATE_PROJECT);
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('OnboardingTour', () => {
  it('welcomes a new user with the choice to start or skip', async () => {
    setUp();

    expect(await screen.findByText('Welcome to Scylla 👋')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip tour' })).toBeInTheDocument();
  });

  it('stays away from a user who cannot create an agent', async () => {
    grant(Permission.CREATE_PROJECT);
    const { saveStatus } = setUp();

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(screen.queryByText('Welcome to Scylla 👋')).not.toBeInTheDocument();
    expect(saveStatus).not.toHaveBeenCalled();
  });

  it('confirms before skipping, and can go back to the tour', async () => {
    const { saveStatus } = setUp();
    await userEvent.click(await screen.findByRole('button', { name: 'Skip tour' }));

    expect(await screen.findByText('Skip the tour?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue the tour' }));

    expect(await screen.findByText('Welcome to Scylla 👋')).toBeInTheDocument();
    expect(saveStatus).not.toHaveBeenCalled();
  });

  it('skips for good once confirmed', async () => {
    const { saveStatus } = setUp();
    await userEvent.click(await screen.findByRole('button', { name: 'Skip tour' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Skip the tour' }));

    await waitFor(() => expect(saveStatus).toHaveBeenCalledWith('anonymous', { kind: 'skipped' }));
    await waitFor(() => expect(screen.queryByText('Skip the tour?')).not.toBeInTheDocument());
  });

  it('ends on the final screen, which completes the tour', async () => {
    const { saveStatus } = setUp({ kind: 'in-progress', step: 'finish' });

    expect(await screen.findByText("You've got the basics of Scylla 🎉")).toBeInTheDocument();
    const docs = screen.getByRole('link', { name: 'Open the documentation' });
    expect(docs).toHaveAttribute('href', 'https://prelude.scylla-ops.com');
    expect(docs).toHaveAttribute('target', '_blank');
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', { kind: 'completed' }),
    );
  });
});
