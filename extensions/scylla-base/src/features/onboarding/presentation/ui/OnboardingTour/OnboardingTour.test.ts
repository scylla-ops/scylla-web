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

const pageElement = (html: string, selector: string) => {
  const page = document.createElement('main');
  page.innerHTML = html;
  document.body.appendChild(page);
  const target = page.querySelector<HTMLElement>(selector);
  if (!target) throw new Error(`no ${selector}`);
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(260, 10, 700, 600));
  Object.defineProperty(target, 'offsetWidth', { configurable: true, value: 700 });
  Object.defineProperty(target, 'offsetHeight', { configurable: true, value: 600 });
  teardown.push(() => page.remove());
  return page;
};

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

  it('blocks the whole page, target included, on a step with Next', async () => {
    setUp({ kind: 'in-progress', step: 'dashboard' });
    const page = pageElement(
      '<div data-slot="sidebar-inset"><button>open</button></div>',
      '[data-slot="sidebar-inset"]',
    );

    expect(await screen.findByText(/The dashboard/)).toBeInTheDocument();
    await waitFor(() => expect(page).toHaveAttribute('inert'));
    expect(document.querySelector('[data-tour-blocker]')).not.toBeNull();
  });

  it('leaves the target usable on a step that the user finishes with a click', async () => {
    setUp({ kind: 'in-progress', step: 'open-agents' });
    const page = pageElement(
      '<button data-nav-url="agents">Agents</button>',
      '[data-nav-url="agents"]',
    );

    expect(await screen.findByText(/Open the Agents tab/)).toBeInTheDocument();
    expect(page).not.toHaveAttribute('inert');
    expect(document.querySelector('[data-tour-blocker]')).toBeNull();
  });
});
