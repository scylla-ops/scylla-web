import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
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

const setUp = (
  stored: OnboardingStatus = { kind: 'not-started' },
  pathname = '/acme/dashboard',
) => {
  const saveStatus = vi.fn((_userId: string, _status: OnboardingStatus) =>
    Promise.resolve(undefined),
  );
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      onboarding: {
        onboardingRepository: {
          getStatus: () => Promise.resolve(stored),
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
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: null } });
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
  it('welcomes a new user with the key features, then the choice of a tour', async () => {
    setUp();

    expect(await screen.findByText('Your machines run the jobs')).toBeInTheDocument();
    for (let slide = 0; slide < 3; slide += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(await screen.findByText('Follow every job')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose a tour' }));

    expect(await screen.findByText('Start with a guided tour')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Connect an agent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start this tour' })).toBeInTheDocument();
  });

  it('starts the recommended tour from the welcome dialog', async () => {
    const { saveStatus } = setUp();
    for (let slide = 0; slide < 3; slide += 1) {
      await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    }
    await userEvent.click(screen.getByRole('button', { name: 'Choose a tour' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Start this tour' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', {
        kind: 'in-progress',
        tour: 'agent',
        step: 'open-agents',
      }),
    );
  });

  it('stays away from a user who cannot create an agent', async () => {
    grant(Permission.CREATE_PROJECT);
    const { saveStatus } = setUp();

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(screen.queryByText('Your machines run the jobs')).not.toBeInTheDocument();
    expect(saveStatus).not.toHaveBeenCalled();
  });

  it('closes the welcome dialog for good on Skip', async () => {
    const { saveStatus } = setUp();
    await userEvent.click(await screen.findByRole('button', { name: 'Skip' }));

    await waitFor(() => expect(saveStatus).toHaveBeenCalledWith('anonymous', { kind: 'skipped' }));
  });

  it('confirms before skipping a tour, and can go back to it', async () => {
    const { saveStatus } = setUp({ kind: 'in-progress', tour: 'agent', step: 'agent-page' });
    pageElement('<div data-tour="agent-details"></div>', '[data-tour="agent-details"]');
    await userEvent.click(await screen.findByText('Skip'));

    expect(await screen.findByText('Skip the tour?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue the tour' }));

    expect(await screen.findByText('Your agent')).toBeInTheDocument();
    expect(saveStatus).not.toHaveBeenCalled();
  });

  it('ends a tour on its own screen, which offers the next tour and completes', async () => {
    const { saveStatus } = setUp({ kind: 'finished', tour: 'agent', done: ['agent'] });

    expect(await screen.findByText('Your agent is ready 🎉')).toBeInTheDocument();
    const docs = screen.getByRole('link', { name: 'Read the docs ›' });
    expect(docs).toHaveAttribute('href', 'https://scylla-ops.com/docs');
    expect(docs).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Start ›' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', { kind: 'completed', done: ['agent'] }),
    );
  });

  it('shows the step number beside the title, Skip at the top and Previous at the bottom', async () => {
    setUp({ kind: 'in-progress', tour: 'agent', step: 'agent-page' });
    pageElement('<div data-tour="agent-details"></div>', '[data-tour="agent-details"]');

    const title = await screen.findByText('Your agent');
    const card = title.closest('[data-tour-focus]') as HTMLElement;
    const header = title.parentElement as HTMLElement;

    expect(within(header).getByText('5/5')).toBeInTheDocument();
    expect(within(header).getByText('Skip')).toBeInTheDocument();
    expect(within(card).getByText('Previous')).toBeInTheDocument();
    expect(within(card).getByText('Finish')).toBeInTheDocument();
  });

  it('repeats the button of the page with its state, and clicks it', async () => {
    setUp({ kind: 'in-progress', tour: 'agent', step: 'new-agent' });
    const page = pageElement(
      '<div data-tour="agents"><span data-part="feature-header-new"><button disabled>Add an agent</button></span></div>',
      '[data-part="feature-header-new"]',
    );
    const real = page.querySelector('button') as HTMLButtonElement;
    const clicked = vi.fn();
    real.addEventListener('click', clicked);

    await screen.findByText('Add an agent', { selector: 'h2' });
    const card = document.querySelector('[data-tour-focus]') as HTMLElement;
    const copy = await within(card).findByText('Add an agent', { selector: 'button' });
    expect(copy).toBeDisabled();

    real.disabled = false;
    await waitFor(() => expect(copy).toBeEnabled());
    await userEvent.click(copy);

    expect(clicked).toHaveBeenCalledOnce();
  });

  it('blocks the whole page, target included, on a step with Next', async () => {
    setUp({ kind: 'in-progress', tour: 'agent', step: 'agent-page' });
    const page = pageElement(
      '<div data-tour="agent-details"><button>open</button></div>',
      '[data-tour="agent-details"]',
    );

    expect(await screen.findByText('Your agent')).toBeInTheDocument();
    await waitFor(() => expect(page).toHaveAttribute('inert'));
    expect(document.querySelector('[data-tour-blocker]')).not.toBeNull();
  });

  it('leaves the target usable on a step that the user finishes with a click', async () => {
    setUp({ kind: 'in-progress', tour: 'agent', step: 'open-agents' });
    const page = pageElement(
      '<button data-nav-url="agents">Agents</button>',
      '[data-nav-url="agents"]',
    );

    expect(await screen.findByText('Open Agents')).toBeInTheDocument();
    expect(page).not.toHaveAttribute('inert');
    expect(document.querySelector('[data-tour-blocker]')).toBeNull();
  });

  it('offers only Go back and Skip when the step is on another page, Previous greyed out', async () => {
    setUp({ kind: 'in-progress', tour: 'agent', step: 'agent-page', subject: { agentId: 'a-1' } });

    const goBack = await screen.findByText('Go back to it', {}, { timeout: 4000 });
    const card = goBack.closest('[data-onboarding-tour]');

    expect(goBack.closest('button')).not.toBeNull();
    expect(screen.getByText('This step is on another page.')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Skip')).toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText('Finish')).not.toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Previous', { selector: 'button' })).toBeDisabled();
  });

  it('offers the tour of a page on a first visit, and starts it there', async () => {
    const { saveStatus } = setUp({ kind: 'skipped', done: ['run'] }, '/acme/agents');

    const offer = await screen.findByRole('dialog', { name: 'Connect an agent' });
    expect(within(offer).getByText('First time here?')).toBeInTheDocument();
    await userEvent.click(within(offer).getByRole('button', { name: 'Start' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', {
        kind: 'in-progress',
        tour: 'agent',
        step: 'new-agent',
        done: ['run'],
      }),
    );
  });

  it('does not offer a tour again once the user turns it down', async () => {
    const { saveStatus } = setUp({ kind: 'completed' }, '/acme/access/roles');
    grant(Permission.MANAGE_WORKSPACE_ROLES);

    const offer = await screen.findByRole('dialog', { name: 'Make a role' });
    await userEvent.click(within(offer).getByRole('button', { name: 'Not now' }));

    await waitFor(() =>
      expect(saveStatus).toHaveBeenCalledWith('anonymous', {
        kind: 'completed',
        declined: ['roles'],
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Make a role' })).not.toBeInTheDocument(),
    );
  });

  it('lets the welcome dialog go first on the page of a tour', async () => {
    setUp({ kind: 'not-started' }, '/acme/agents');

    expect(await screen.findByText('Your machines run the jobs')).toBeInTheDocument();
    expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
  });

  it('greys Previous out on the first step, and offers Go on a step in the menu', async () => {
    setUp({ kind: 'in-progress', tour: 'roles', step: 'open-roles' });
    pageElement('<a data-nav-url="members">Members</a>', '[data-nav-url="members"]');

    const title = await screen.findByText('Open Roles');
    const card = title.closest('[data-tour-focus]') as HTMLElement;

    expect(within(card).getByText('Previous', { selector: 'button' })).toBeDisabled();
    expect(within(card).getByText('Go', { selector: 'button' })).toBeEnabled();
  });
});
