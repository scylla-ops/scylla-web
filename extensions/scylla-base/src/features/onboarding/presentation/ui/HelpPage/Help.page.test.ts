import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import HelpPage from './Help.page.svelte';

let teardown: Array<() => void> = [];

const grant = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

const setUp = (stored: OnboardingStatus) => {
  const saveStatus = vi.fn((_userId: string, _status: OnboardingStatus) =>
    Promise.resolve(undefined),
  );
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/help/tours' });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      onboarding: {
        onboardingRepository: { getStatus: () => Promise.resolve(stored), saveStatus },
      },
    }),
  ];
  render(HelpPage);
  return { saveStatus, navigate: navigator.navigate };
};

beforeEach(() => {
  localStorage.clear();
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: 'acme' } });
  grant(Permission.CREATE_AGENT, Permission.CREATE_PROJECT);
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

const row = (id: string) => {
  const element = document.querySelector<HTMLElement>(`[data-tour-row="${id}"]`);
  if (!element) throw new Error(`no row ${id}`);
  return element;
};

describe('Help page', () => {
  it('lists the tours that the user may start, with the ones that are done', async () => {
    setUp({ kind: 'completed', done: ['agent'] });

    expect(await screen.findByText('Connect an agent')).toBeInTheDocument();
    expect(screen.queryByText('Make a role')).not.toBeInTheDocument();
    expect(screen.getAllByText('1 of 5 done').length).toBeGreaterThan(0);
    expect(within(row('agent')).getByRole('button', { name: 'Restart' })).toBeInTheDocument();
    expect(within(row('run')).getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('starts a tour at its first step and on its page', async () => {
    const { saveStatus, navigate } = setUp({ kind: 'skipped' });
    await screen.findByText('Keep a secret');

    await userEvent.click(within(row('secrets')).getByRole('button', { name: 'Start' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', {
        kind: 'in-progress',
        tour: 'secrets',
        step: 'secrets-project',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined);
  });

  it('shows the welcome dialog again and keeps the tours that are done', async () => {
    const { saveStatus } = setUp({ kind: 'completed', done: ['agent'] });

    await userEvent.click(await screen.findByRole('button', { name: 'Show again' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', {
        kind: 'not-started',
        done: ['agent'],
      }),
    );
  });

  it('opens the docs in a new tab', async () => {
    setUp({ kind: 'completed' });

    const docs = await screen.findByRole('link', { name: 'Open the docs' });
    expect(docs).toHaveAttribute('href', 'https://scylla-ops.com/docs');
    expect(docs).toHaveAttribute('target', '_blank');
  });
});
