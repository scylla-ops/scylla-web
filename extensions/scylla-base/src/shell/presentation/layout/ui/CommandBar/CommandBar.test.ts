import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi, type Mock } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import FolderIcon from '@lucide/svelte/icons/folder';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import {
  setAppNavigator,
  setInstalledExtensions,
  setNavLinks,
  type AppNavigator,
  type AppNavLink,
  type CommandDefinition,
} from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import Fixture from './CommandBar.fixture.svelte';

vi.mock('svelte-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const WORKSPACE = { title: msg`Workspace`, id: 'workspace' };
const MACHINES = msg`Machines`;

const link = (url: string, title: ReturnType<typeof msg>, extra: Partial<AppNavLink> = {}) => ({
  href: `/acme/${url}`,
  url,
  title,
  section: WORKSPACE,
  ...extra,
});

const LINKS: AppNavLink[] = [
  link('agents', msg`Agents`, { group: MACHINES }),
  link('apps', msg`Apps`, { group: MACHINES }),
  link('account/appearance', msg`Appearance`, {
    keywords: msg`theme`,
    section: { id: 'account', title: msg`Account` },
  }),
];

const setTheme = vi.fn();
const undoTheme = vi.fn();
let theme = 'dark';
const setToggle = vi.fn();
const signOut = vi.fn();

const COMMANDS: CommandDefinition[] = [
  {
    id: 't.light',
    kind: 'choice',
    title: msg`Light theme`,
    type: msg`Theme`,
    icon: FolderIcon,
    current: () => theme === 'light',
    select: () => setTheme('light'),
  },
  {
    id: 't.dark',
    kind: 'choice',
    title: msg`Dark theme`,
    type: msg`Theme`,
    icon: FolderIcon,
    current: () => theme === 'dark',
    select: () => undoTheme('dark'),
  },
  {
    id: 't.compact',
    kind: 'toggle',
    title: msg`Compact rows`,
    type: msg`Layout`,
    icon: FolderIcon,
    on: () => false,
    set: setToggle,
  },
  {
    id: 't.form',
    kind: 'create',
    title: msg`New project`,
    icon: FolderIcon,
    permission: Permission.CREATE_PROJECT,
    form: { load: () => Promise.resolve({ default: {} as never }) },
  },
  {
    id: 't.page',
    kind: 'create',
    title: msg`New trigger`,
    icon: FolderIcon,
    form: { path: () => '/acme/triggers/new' },
  },
  {
    id: 't.sign-out',
    kind: 'confirm',
    title: msg`Sign out`,
    icon: FolderIcon,
    type: msg`Session`,
    verb: msg`Sign out`,
    question: msg`Sign out of Scylla?`,
    run: signOut,
  },
  {
    id: 't.jobs',
    kind: 'go',
    title: msg`Jobs of this pipeline`,
    icon: FolderIcon,
    here: () => true,
    path: () => '/acme/jobs',
  },
];

const reads = () => ({
  getByWorkspaceId: vi.fn(() =>
    Promise.resolve({
      items: [
        { id: 'p1', name: 'web-api' },
        { id: 'p2', name: 'mobile-app' },
      ],
    }),
  ),
  getMetadataByWorkspaceId: vi.fn(() =>
    Promise.resolve({ items: [{ id: 'l1', name: 'Build web', projectId: 'p1' }] }),
  ),
  listApps: vi.fn(() =>
    Promise.resolve([
      { id: 'a1', name: 'prod-runner', runner: true, connected: true },
      { id: 'a2', name: 'release-bot', runner: false },
    ]),
  ),
  listMembers: vi.fn(() =>
    Promise.resolve([
      { actorId: 'u1', actorKind: 'user', displayName: 'Marie Dubois', handle: 'marie', roles: [] },
      { actorId: 'a1', actorKind: 'app', displayName: 'A bot', handle: 'bot', roles: [] },
    ]),
  ),
  listRoles: vi.fn((workspaceId?: string) =>
    Promise.resolve(
      workspaceId
        ? [{ key: 'r1', name: 'Reviewer', builtin: false }]
        : [{ key: 'r2', name: 'Auditor', builtin: false }],
    ),
  ),
  listByProjectId: vi.fn(() => Promise.resolve([{ name: 'DATABASE_URL' }])),
  getMine: vi.fn(() =>
    Promise.resolve([
      { id: 'w1', name: 'Acme', slug: 'acme' },
      { id: 'w2', name: 'Globex', slug: 'globex' },
    ]),
  ),
  run: vi.fn(() => Promise.resolve()),
});

let fakes: ReturnType<typeof reads>;
let teardown: (() => void)[] = [];
let navigate: Mock<AppNavigator['navigate']>;
let params: Record<string, string>;
const openForm = vi.fn();
const onOpenChange = vi.fn();

const grant = (permissions?: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: permissions ? { kind: 'restricted', permissions } : { kind: 'fullControl' },
        },
      ],
    },
  });

const open = async () => {
  render(Fixture, { openForm, onOpenChange });
  await focusSettled();
  return screen.findByRole('combobox');
};

const user = () => userEvent.setup();

const pressUndo = () => {
  const [, options] = vi.mocked(toast.success).mock.calls[0];
  (options?.action as unknown as { onClick: () => void }).onClick();
};

const option = (name: RegExp | string) => screen.findByRole('option', { name });
const options = () => screen.queryAllByRole('option');
const selected = () =>
  options().find(element => element.getAttribute('aria-selected') === 'true')?.getAttribute('aria-label');
const chip = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  theme = 'dark';
  localStorage.clear();
  vi.clearAllMocks();
  fakes = reads();
  params = { workspaceSlug: 'acme' };
  navigate = vi.fn<AppNavigator['navigate']>();
  setAppNavigator({
    navigate,
    back: vi.fn(),
    pathname: () => '/acme',
    search: () => '',
    params: () => params,
    trail: () => [],
  });
  setNavLinks(() => LINKS);
  setInstalledExtensions([
    { id: 'test', name: 'Test', version: '1.0.0', modules: [{ id: 't', domain: {}, commands: COMMANDS }] },
  ]);
  grant();
  contextStore.setState({
    workspace: { id: 'w1', name: 'Acme', slug: 'acme' },
    project: { id: 'p1', name: 'web-api' },
    pipeline: { id: null, name: null },
  });
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      project: { projectRepository: { getByWorkspaceId: fakes.getByWorkspaceId } },
      pipeline: {
        pipelineRepository: {
          getMetadataByWorkspaceId: fakes.getMetadataByWorkspaceId,
          run: fakes.run,
        },
      },
      apps: { appsRepository: { listApps: fakes.listApps } },
      access: { accessRepository: { listMembers: fakes.listMembers } },
      roles: { roleRepository: { list: fakes.listRoles } },
      secret: { secretRepository: { listByProjectId: fakes.listByProjectId } },
      workspace: { workspaceRepository: { getMine: fakes.getMine } },
    }),
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  setAppNavigator(null);
  setNavLinks(() => []);
  setInstalledExtensions([]);
  permissionsStore.setState({ permissions: null });
  contextStore.getState().reset();
  vi.unstubAllGlobals();
});

describe('CommandBar', () => {
  describe('what a row says', () => {
    it('finds a page with a typing error, and goes to it', async () => {
      const input = await open();
      await user().type(input, 'agnets{Enter}');

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/agents', undefined));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows the name, the type, the place and the verb', async () => {
      const input = await open();
      await user().type(input, 'agents');

      const row = await option('Go to the page Agents (Machines).');
      expect(within(row).getByText('Page · Machines')).toBeInTheDocument();
      expect(within(row).getByText('Go to')).toBeInTheDocument();
    });

    it('shows in bold the letters that matched', async () => {
      const input = await open();
      await user().type(input, 'age');

      const row = await option('Go to the page Agents (Machines).');
      expect(row.querySelector('strong')).toHaveTextContent('Age');
    });

    it('gives the full sentence of the highlighted row in the footer', async () => {
      const input = await open();
      await user().type(input, 'light');

      await waitFor(() => expect(selected()).toMatch(/Light theme/));
      expect(
        screen.getByText('Use Light theme. Now: Dark theme. This device only.', {
          selector: 'span:not([role=option] span)',
        }),
      ).toBeInTheDocument();
    });

    it('says that the results are not exact', async () => {
      const input = await open();
      await user().type(input, 'agnets');

      expect(await screen.findByText('No exact match. Close results:')).toBeInTheDocument();
    });

    it('does not say it for an exact result', async () => {
      const input = await open();
      await user().type(input, 'agents');

      await option('Go to the page Agents (Machines).');
      expect(screen.queryByText('No exact match. Close results:')).not.toBeInTheDocument();
    });
  });

  describe('each type of result', () => {
    const go = async (text: string, sentence: string, href: string) => {
      const input = await open();
      const typing = user();
      await typing.type(input, text);
      await option(sentence);
      await waitFor(() => expect(selected()).toBe(sentence));
      await typing.keyboard('{Enter}');
      await waitFor(() => expect(navigate).toHaveBeenCalledWith(href, undefined));
    };

    it('goes to a project', () =>
      go('web-api', 'Go to the project web-api.', '/acme/projects/p1'));

    it('goes to a pipeline, and names its project', () =>
      go(
        'build web',
        'Go to the pipeline Build web (web-api).',
        '/acme/projects/p1/pipelines/l1/jobs',
      ));

    it('goes to an agent', () => go('prod-runner', 'Go to the agent prod-runner.', '/acme/agents/a1'));

    it('goes to an app', () => go('release-bot', 'Go to the app release-bot.', '/acme/apps/a2'));

    it('goes to a member', () =>
      go('marie dubois', 'Go to the member Marie Dubois (marie).', '/acme/access/members/u1'));

    it('goes to a role of the workspace', () =>
      go('reviewer', 'Go to the role Reviewer (Access).', '/acme/access/roles/r1'));

    it('goes to a role of the instance', () =>
      go('auditor', 'Go to the role Auditor (Instance).', '/acme/instance/roles/r2'));

    it('goes to the page of a secret', () =>
      go(
        'database_url',
        'Go to the secrets page, at DATABASE_URL (web-api). The value stays hidden.',
        '/acme/projects/p1/secrets',
      ));

    it('opens the page of a form', () =>
      go(
        'new trigger',
        'Open the form: New trigger. Nothing changes until you submit it.',
        '/acme/triggers/new',
      ));

    it('switches the workspace', async () => {
      await go('globex', 'Switch to the workspace Globex.', '/globex/dashboard');

      expect(contextStore.getState().workspace).toMatchObject({ id: 'w2', slug: 'globex' });
    });

    it('opens a form, which outlives the bar', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'new project');
      await option(/New project/);
      await waitFor(() => expect(selected()).toMatch(/New project/));
      await typing.keyboard('{Enter}');

      await waitFor(() => expect(openForm).toHaveBeenCalledOnce());
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('changes a preference at once, and gives an Undo', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'light');
      await option(/Light theme/);
      await waitFor(() => expect(selected()).toMatch(/Light theme/));
      await typing.keyboard('{Enter}');

      await waitFor(() => expect(setTheme).toHaveBeenCalledWith('light'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      await waitFor(() => expect(toast.success).toHaveBeenCalled());

      expect(vi.mocked(toast.success).mock.calls[0][0]).toBe('Now using: Light theme');
      pressUndo();
      expect(undoTheme).toHaveBeenCalledWith('dark');
    });

    it('turns on a setting, and gives an Undo', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'compact');
      const row = await option(/Compact rows/);
      expect(within(row).getByText('Turn on')).toBeInTheDocument();
      await waitFor(() => expect(selected()).toMatch(/Compact rows/));
      await typing.keyboard('{Enter}');

      await waitFor(() => expect(setToggle).toHaveBeenCalledWith(true));
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      pressUndo();
      expect(setToggle).toHaveBeenLastCalledWith(false);
    });

    it('shows the active choice as current, last, and Enter does nothing on it', async () => {
      const input = await open();
      await user().type(input, 'theme');

      await option(/Light theme/);
      const rows = options().map(element => element.getAttribute('aria-label'));
      expect(rows.indexOf('Dark theme is the current choice.')).toBeGreaterThan(
        rows.findIndex(name => name?.includes('Light theme')),
      );
      const current = await option('Dark theme is the current choice.');
      expect(current).toHaveAttribute('aria-disabled', 'true');
      expect(within(current).getByText('Current')).toBeInTheDocument();
    });
  });

  it('shows a pointer on a row', async () => {
    const input = await open();
    await user().type(input, 'agents');

    expect(await option('Go to the page Agents (Machines).')).toHaveClass('cursor-pointer');
  });

  describe('an action with a confirmation', () => {
    const toConfirm = async (text: string, name: RegExp) => {
      const input = await open();
      const typing = user();
      await typing.type(input, text);
      await option(name);
      await waitFor(() => expect(selected()).toMatch(name));
      await typing.keyboard('{Enter}');
      return typing;
    };

    it('asks first, and a second Enter runs it', async () => {
      const typing = await toConfirm('sign out', /Sign out/);

      expect(await screen.findByText('Sign out of Scylla?')).toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Sign out' })).toHaveFocus(),
      );
      await typing.keyboard('{Enter}');

      await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it('does not run on a key still down from the row', async () => {
      await toConfirm('sign out', /Sign out/);
      const confirm = await screen.findByRole('button', { name: 'Sign out' });
      await waitFor(() => expect(confirm).toHaveFocus());

      expect(await fireEvent.keyDown(confirm, { key: 'Enter', repeat: true })).toBe(false);
      expect(signOut).not.toHaveBeenCalled();
    });

    it('goes back to the results with Escape, and keeps the text', async () => {
      const typing = await toConfirm('sign out', /Sign out/);
      const confirm = await screen.findByRole('button', { name: 'Sign out' });
      await waitFor(() => expect(confirm).toHaveFocus());

      await typing.keyboard('{Escape}');

      expect(await screen.findByRole('combobox')).toHaveValue('sign out');
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(signOut).not.toHaveBeenCalled();
    });

    it('runs a pipeline only with a word that means to run', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'build web');
      await option(/Go to the pipeline Build web/);
      expect(screen.queryByRole('option', { name: /Run the pipeline/ })).not.toBeInTheDocument();

      await typing.clear(input);
      await typing.type(input, 'rnu build');
      expect(await option(/Run the pipeline Run Build web/)).toBeInTheDocument();
    });

    it('runs a pipeline after the confirmation', async () => {
      const typing = await toConfirm('run build', /Run the pipeline/);

      const confirm = await screen.findByRole('button', { name: 'Run Build web' });
      expect(fakes.run).not.toHaveBeenCalled();
      await waitFor(() => expect(confirm).toHaveFocus());
      await typing.keyboard('{Enter}');

      await waitFor(() => expect(fakes.run).toHaveBeenCalledWith('l1'));
    });

    it('hides the run without the permission', async () => {
      grant([Permission.LIST_PIPELINES_BY_WORKSPACE]);
      const input = await open();
      await user().type(input, 'run build');

      await option(/Go to the pipeline Build web/);
      expect(screen.queryByRole('option', { name: /Run the pipeline/ })).not.toBeInTheDocument();
    });
  });

  describe('the keyboard', () => {
    it('moves with the arrows, and loops', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'ap');
      await option(/Apps/);

      await waitFor(() => expect(selected()).toMatch(/Apps/));
      const count = options().filter(element => element.getAttribute('aria-disabled') !== 'true').length;
      const first = selected();
      for (let step = 0; step < count; step++) await typing.keyboard('{ArrowDown}');
      expect(selected()).toBe(first);
      await typing.keyboard('{ArrowUp}{ArrowDown}');
      expect(selected()).toBe(first);
    });

    it('names the new tab key of the computer', async () => {
      const input = await open();
      await user().type(input, 'agents');
      expect(await screen.findByText('Ctrl ↵')).toBeInTheDocument();
    });

    it('names the new tab key of a Mac', async () => {
      const agent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
      onTestFinished(() => agent.mockRestore());

      const input = await open();
      await user().type(input, 'agents');

      expect(await screen.findByText('⌘↵')).toBeInTheDocument();
    });

    it('opens a link in a new tab', async () => {
      const windowOpen = vi.fn();
      vi.stubGlobal('open', windowOpen);
      const input = await open();
      const typing = user();
      await typing.type(input, 'agents');
      await waitFor(() => expect(selected()).toMatch(/Agents/));

      await fireEvent.keyDown(input, { key: 'Enter', metaKey: true });

      expect(windowOpen).toHaveBeenCalledWith('/acme/agents', '_blank', 'noopener');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not open a row again while Enter stays down', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'agents');
      await waitFor(() => expect(selected()).toMatch(/Agents/));

      await fireEvent.keyDown(input, { key: 'Enter', repeat: true });

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not pick a row while a text composes', async () => {
      const input = await open();
      const typing = user();
      await typing.type(input, 'agents');
      await waitFor(() => expect(selected()).toMatch(/Agents/));

      await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

      expect(navigate).not.toHaveBeenCalled();
    });

    it('changes the filter with Tab and Shift Tab', async () => {
      const input = await open();
      const typing = user();
      await waitFor(() => expect(chip('All')).toHaveAttribute('aria-pressed', 'true'));

      await typing.keyboard('{Tab}');
      expect(chip('Pages')).toHaveAttribute('aria-pressed', 'true');
      await typing.keyboard('{Tab}');
      expect(chip('Actions')).toHaveAttribute('aria-pressed', 'true');
      await typing.keyboard('{Shift>}{Tab}{/Shift}');
      expect(chip('Pages')).toHaveAttribute('aria-pressed', 'true');
      expect(input).toHaveFocus();
    });

    it('takes away the filter with Backspace when the text is empty', async () => {
      await open();
      const typing = user();
      await typing.keyboard('{Tab}');
      expect(chip('Pages')).toHaveAttribute('aria-pressed', 'true');

      await typing.keyboard('{Backspace}');

      expect(chip('All')).toHaveAttribute('aria-pressed', 'true');
    });

    it('leaves the filter with Escape, then the bar', async () => {
      await open();
      const typing = user();
      await typing.keyboard('{Tab}');

      await typing.keyboard('{Escape}');
      expect(chip('All')).toHaveAttribute('aria-pressed', 'true');
      expect(onOpenChange).not.toHaveBeenCalled();

      await typing.keyboard('{Escape}');
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it('announces the number of results', async () => {
      const input = await open();
      await user().type(input, 'agents');

      await option(/Agents/);
      expect(screen.getByRole('status')).toHaveTextContent(/Results: \d+/);
    });
  });

  describe('the filters', () => {
    it('lists the rows of a filter with no text', async () => {
      await open();
      await fireEvent.click(chip('Pages'));

      expect(await option(/Agents/)).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /New trigger/ })).not.toBeInTheDocument();
    });

    it('shows a chip only for a group with rows', async () => {
      grant([]);
      await open();

      expect(chip('Pages')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Projects' })).not.toBeInTheDocument();
    });

    it.each([
      ['>', 'Actions', /New trigger/, /Agents/],
      ['/', 'Pages', /Agents/, /New trigger/],
      ['#', 'Projects', /Go to the project web-api/, /Agents/],
      ['@', 'People', /Marie Dubois/, /Agents/],
    ])('gives %s the filter %s', async (prefix, name, shown, hidden) => {
      const input = await open();
      await user().type(input, prefix);

      expect(await option(shown)).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: hidden })).not.toBeInTheDocument();
      expect(chip(name)).toHaveAttribute('aria-pressed', 'true');
    });

    it('marks two chips for the prefix of the projects and of the pipelines', async () => {
      const input = await open();
      await user().type(input, '#');

      await waitFor(() => expect(chip('Projects')).toHaveAttribute('aria-pressed', 'true'));
      await waitFor(() => expect(chip('Pipelines')).toHaveAttribute('aria-pressed', 'true'));
    });

    it('searches with the text after a prefix', async () => {
      const input = await open();
      await user().type(input, '#mobil');

      expect(await option('Go to the project mobile-app.')).toBeInTheDocument();
    });
  });

  describe('the groups', () => {
    it('keeps 4 rows, and the next row opens all of them', async () => {
      fakes.getByWorkspaceId.mockResolvedValue({
        items: ['a', 'b', 'c', 'd', 'e', 'f'].map(name => ({ id: name, name: `service-${name}` })),
      });
      const input = await open();
      const typing = user();
      await typing.type(input, 'service');

      const more = await option('Show all the results in Projects.');
      expect(within(more).getByText('2 more')).toBeInTheDocument();

      await fireEvent.click(more);

      expect(await option('Go to the project service-f.')).toBeInTheDocument();
      expect(chip('Projects')).toHaveAttribute('aria-pressed', 'true');
    });

    it('puts first a row that is better than the others', async () => {
      fakes.getByWorkspaceId.mockResolvedValue({ items: [{ id: 'p9', name: 'Agents' }] });
      contextStore.setState({ project: { id: null, name: null } });
      setNavLinks(() => [link('agnts', msg`Agnets of the fleet`)]);
      const input = await open();
      await user().type(input, 'agents');

      expect(await screen.findByText('Best match')).toBeInTheDocument();
      await waitFor(() => expect(options()[0]).toHaveAccessibleName('Go to the project Agents.'));
    });
  });

  describe('the start of the bar', () => {
    it('shows the preferences', async () => {
      await open();

      expect(await screen.findByText('Preferences')).toBeInTheDocument();
      expect(await option(/Light theme/)).toBeInTheDocument();
    });

    it('shows what acts on this page', async () => {
      params = { workspaceSlug: 'acme', pipelineId: 'l1' };
      await open();

      expect(await screen.findByText('On this pipeline')).toBeInTheDocument();
      expect(await option(/Jobs of this pipeline/)).toBeInTheDocument();
      expect(await option(/Run the pipeline Run Build web/)).toBeInTheDocument();
    });

    it('shows the last pick, once', async () => {
      const first = await open();
      const typing = user();
      await typing.type(first, 'agents');
      await waitFor(() => expect(selected()).toMatch(/Agents/));
      await typing.keyboard('{Enter}');
      await waitFor(() => expect(navigate).toHaveBeenCalled());
      expect(JSON.parse(localStorage.getItem('scylla-command-bar-recent:w1') ?? '[]')).toEqual([
        'page:workspace/agents',
      ]);
    });

    it('reads a recent row from the list of this workspace', async () => {
      localStorage.setItem('scylla-command-bar-recent:w1', JSON.stringify(['page:workspace/agents']));
      await open();

      expect(await screen.findByText('Recent')).toBeInTheDocument();
      expect(options()[0]).toHaveAccessibleName('Go to the page Agents (Machines).');
    });
  });

  describe('the state of the lists', () => {
    it('does not say "nothing" while a list reads', async () => {
      fakes.getByWorkspaceId.mockReturnValue(new Promise(() => undefined) as never);
      const input = await open();
      await user().type(input, 'zzzzzz');

      expect(await screen.findByText('Reading the lists…')).toBeInTheDocument();
      expect(screen.queryByText('Nothing matches this search.')).not.toBeInTheDocument();
    });

    it('says which list failed, not "nothing"', async () => {
      fakes.getByWorkspaceId.mockRejectedValue(new Error('down'));
      const input = await open();
      await user().type(input, 'zzzzzz');

      expect(await screen.findByText('These lists could not be read: Projects.')).toBeInTheDocument();
      expect(screen.queryByText('Nothing matches this search.')).not.toBeInTheDocument();
    });

    it('says "nothing" when all the lists answered', async () => {
      const input = await open();
      await user().type(input, 'zzzzzz');

      expect(await screen.findByText('Nothing matches this search.')).toBeInTheDocument();
    });
  });

  describe('the permissions', () => {
    it('reads no list without its permission', async () => {
      grant([]);
      await open();
      await focusSettled();

      expect(fakes.getByWorkspaceId).not.toHaveBeenCalled();
      expect(fakes.getMetadataByWorkspaceId).not.toHaveBeenCalled();
      expect(fakes.listApps).not.toHaveBeenCalled();
      expect(fakes.listMembers).not.toHaveBeenCalled();
      expect(fakes.listByProjectId).not.toHaveBeenCalled();
    });

    it('hides a command without its permission', async () => {
      grant([]);
      const input = await open();
      await user().type(input, 'new project');

      await waitFor(() =>
        expect(screen.queryByRole('option', { name: /New project/ })).not.toBeInTheDocument(),
      );
    });

    it('reads the secrets of the open project only', async () => {
      await open();

      await waitFor(() => expect(fakes.listByProjectId).toHaveBeenCalledWith('p1'));
    });
  });
});
