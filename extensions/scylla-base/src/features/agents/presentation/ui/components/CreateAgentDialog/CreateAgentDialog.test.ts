import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, PrincipalKind, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import { AGENT_QUERY_KEY } from '@base/features/agents/presentation/agents.queries.ts';
import CreateAgentDialog from './CreateAgentDialog.svelte';

const agent = (overrides: Partial<AgentEntity> = {}): AgentEntity => ({
  id: 'agent-new',
  organizationId: 'org-1',
  name: 'build-runner-02',
  isActive: true,
  connected: false,
  lastSeen: '',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const SECRET = '50b61c72d83e94fa';
const LONG_SECRET = '7f3a9c0e5b2d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a';
const MORE_THAN_ONE_POLL_MS = 2500;
const OUTSIDE_CLICK_DEBOUNCE_MS = 20;

const fullControl = { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } };

const grant = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        permissions === 'all'
          ? fullControl
          : {
              scope: PermissionScope.SYSTEM,
              scopeId: '',
              access: { kind: 'restricted', permissions },
            },
      ],
    },
  } as never);

const reduceMotion = (reduce: boolean) =>
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

let createAgent: ReturnType<typeof vi.fn>;
let getAgent: ReturnType<typeof vi.fn>;
let listProjects: ReturnType<typeof vi.fn>;
let createGrant: ReturnType<typeof vi.fn>;
let listGrants: ReturnType<typeof vi.fn>;
let revokeGrant: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let nav: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  reduceMotion(true);
  localStorage.setItem('userId', 'ada');

  createAgent = vi.fn().mockResolvedValue(ScyllaResult.success({ agent: agent(), secret: SECRET }));
  getAgent = vi.fn().mockResolvedValue(ScyllaResult.success(agent()));
  listProjects = vi.fn().mockResolvedValue(ScyllaResult.success({ projects: [] }));
  createGrant = vi.fn().mockResolvedValue(ScyllaResult.success({ id: 'grant-project' }));
  listGrants = vi.fn().mockResolvedValue(
    ScyllaResult.success([
      {
        id: 'grant-org',
        principal: { kind: PrincipalKind.APP, id: 'agent-new' },
        roleId: 'organization-agent',
        scope: PermissionScope.ORGANIZATION,
        scopeId: 'org-1',
      },
      {
        id: 'grant-other',
        principal: { kind: PrincipalKind.APP, id: 'agent-old' },
        roleId: 'organization-agent',
        scope: PermissionScope.ORGANIZATION,
        scopeId: 'org-1',
      },
    ]),
  );
  revokeGrant = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    agents: { agentsRepository: { createAgent, getAgent } },
    project: { projectRepository: { getByOrganizationId: listProjects } },
    roles: {
      permissionRepository: {
        createGrant,
        listGrants,
        revokeGrant,
        getMyPermissions: () =>
          Promise.resolve(
            ScyllaResult.success(permissionsStore.getState().permissions ?? { scopes: [] }),
          ),
      },
    },
  });

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  nav = installTestNavigator({ pathname: '/acme/agents' });
  grant('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  nav.restore();
  localStorage.removeItem('userId');
  permissionsStore.setState({ permissions: null });
});

const dialog = () => within(screen.getByRole('dialog'));

const fillAndCreate = async (name = 'build-runner-02') => {
  await focusSettled();
  await userEvent.type(dialog().getByRole('textbox', { name: 'Name' }), name);
  await userEvent.click(dialog().getByRole('button', { name: 'Create agent' }));
};

const startStep = () => screen.findByRole('heading', { name: 'Start build-runner-02' });

const secretBox = () => {
  const box = document.querySelector('[data-tour="agent-secret"]');
  if (!(box instanceof HTMLElement)) throw new Error('no secret box');
  return box;
};

const showSecret = () =>
  userEvent.click(within(secretBox()).getByRole('button', { name: 'Show the secret' }));

const commandBox = () => {
  const box = document.querySelector('[data-tour="agent-run-command"]');
  if (!(box instanceof HTMLElement)) throw new Error('no run command');
  return box;
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => (resolve = done));
  return { promise, resolve };
};

const createdAgent = (secret = SECRET) => ScyllaResult.success({ agent: agent(), secret });

const command = () => {
  const block = document.querySelector('[data-tour="agent-run-command"]');
  if (!block) throw new Error('no run command');
  return block.querySelector('pre')?.textContent ?? '';
};

describe('CreateAgentDialog', () => {
  it('lays out its header, body and footer on one edge, with no icon column', () => {
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    const parts = [...screen.getByRole('dialog').querySelectorAll('[data-dialog-part]')].map(part =>
      part.getAttribute('data-dialog-part'),
    );
    expect(parts).toEqual(['header', 'body', 'footer']);
    const header = screen.getByRole('dialog').querySelector('[data-dialog-part="header"]');
    expect(header?.firstElementChild).toBe(dialog().getByRole('heading', { name: 'New agent' }));
  });

  it('creates the agent, then shows its secret and the commands to start it', async () => {
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    await fillAndCreate();

    expect(await startStep()).toBeInTheDocument();
    expect(createAgent.mock.lastCall).toEqual(['org-1', 'build-runner-02']);
    expect(document.body.innerHTML).not.toContain(SECRET);

    await showSecret();

    expect(screen.getByText(SECRET)).toBeInTheDocument();
    expect(command()).toContain('docker run -d --restart unless-stopped');
    expect(command()).toContain('--app-id agent-new');
    expect(command()).toContain(`--app-secret ${SECRET}`);
    expect(screen.getByText('You will not see this secret again.')).toBeInTheDocument();
  });

  it('builds the commands from the address field, live, for each way to run the agent', async () => {
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await fillAndCreate();
    await startStep();
    await showSecret();

    const address = screen.getByRole('textbox', { name: 'Scylla address' });
    expect(address).toHaveValue(window.location.origin);

    await userEvent.clear(address);
    await userEvent.type(address, 'http://10.0.0.5:8080');
    expect(command()).toContain('--control-plane-url http://10.0.0.5:8080');

    await userEvent.click(screen.getByRole('radio', { name: 'Docker Compose' }));
    expect(command()).toContain('SCYLLA_CONTROL_PLANE_URL: "http://10.0.0.5:8080"');
    expect(command()).toContain(`SCYLLA_APP_SECRET: "${SECRET}"`);

    await userEvent.click(screen.getByRole('radio', { name: 'From source' }));
    expect(command()).toContain('cargo run --release --bin scylla-agent');
  });

  it('offers one project only to a user who manages the grants of an organization with projects', async () => {
    listProjects.mockResolvedValue(
      ScyllaResult.success({ projects: [{ id: 'p-1', name: 'prelude' }] }),
    );
    const { unmount } = render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    expect(await dialog().findByRole('radio', { name: /One project/ })).toBeChecked();
    unmount();

    grant([Permission.CREATE_AGENT, Permission.LIST_PROJECTS_BY_ORGANIZATION]);
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    expect(await dialog().findByRole('radio', { name: 'All projects of Acme' })).toBeChecked();
    expect(dialog().queryByRole('radio', { name: /One project/ })).not.toBeInTheDocument();
  });

  it('limits the agent to one project: a project grant, then the organization grant goes', async () => {
    listProjects.mockResolvedValue(
      ScyllaResult.success({ projects: [{ id: 'p-1', name: 'prelude' }] }),
    );
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await dialog().findByRole('radio', { name: /One project/ });

    await fillAndCreate();
    await startStep();

    expect(createGrant).toHaveBeenCalledWith({
      principal: { kind: PrincipalKind.APP, id: 'agent-new' },
      roleId: 'project-agent',
      scope: PermissionScope.PROJECT,
      scopeId: 'p-1',
    });
    expect(listGrants).toHaveBeenCalledWith(PermissionScope.ORGANIZATION, 'org-1');
    expect(revokeGrant).toHaveBeenCalledWith('grant-org');
    expect(revokeGrant).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('It can take the jobs of every project')).not.toBeInTheDocument();
  });

  it('still shows the secret when a grant step fails, and warns that every project stays open', async () => {
    listProjects.mockResolvedValue(
      ScyllaResult.success({ projects: [{ id: 'p-1', name: 'prelude' }] }),
    );
    createGrant.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('denied', { cause: { code: 'PERMISSION_DENIED' } })),
    );
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await dialog().findByRole('radio', { name: /One project/ });

    await fillAndCreate();
    await startStep();

    expect(secretBox()).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('It can take the jobs of every project');
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it('keeps step 1 when the creation fails, with the inputs usable again', async () => {
    createAgent.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('taken', { cause: { code: 'ALREADY_EXISTS' } })),
    );
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    await fillAndCreate();

    await vi.waitFor(() => expect(dialog().getByRole('textbox', { name: 'Name' })).toBeEnabled());
    expect(dialog().getByRole('heading', { name: 'New agent' })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('waits for the first connection, then shows the host and opens the agent', async () => {
    getAgent.mockResolvedValueOnce(ScyllaResult.success(agent())).mockResolvedValue(
      ScyllaResult.success(
        agent({
          connected: true,
          lastSeen: '2026-10-11T08:00:00.000Z',
          host: {
            version: '0.5.0',
            os: 'macos',
            arch: 'aarch64',
            hostname: 'runner.local',
            cpuCount: 15,
            totalMemoryMb: 24576,
            reportedAt: '2026-10-11T08:00:00.000Z',
          },
        }),
      ),
    );
    const onClose = vi.fn();
    render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();
    await startStep();

    expect(await screen.findByText('Waiting for the first connection…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open agent' })).toBeDisabled();

    expect(
      await screen.findByText('Connected from runner.local', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('macos/aarch64 · 15 CPU · 24 GB · agent 0.5.0. It waits for jobs.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open agent' }));
    expect(onClose).toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith('/acme/agents/agent-new', undefined);
  });

  it('drops the secret on close: the next opening starts again at step 1', async () => {
    const onClose = vi.fn();
    const { rerender } = render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();
    await startStep();
    await showSecret();
    expect(screen.getByText(SECRET)).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' })[0],
    );
    expect(onClose).toHaveBeenCalled();

    await rerender({ open: false });
    await rerender({ open: true });

    expect(await screen.findByRole('heading', { name: 'New agent' })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('validates the creation, then slides to step 2', async () => {
    reduceMotion(false);
    const animate = vi.mocked(Element.prototype.animate);
    animate.mockClear();
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    await fillAndCreate();

    expect(await dialog().findByRole('button', { name: 'Created' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Start build-runner-02' }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Start build-runner-02' }, { timeout: 2000 }),
    ).toBeInTheDocument();
    const keyframes = animate.mock.calls.map(([frames]) => JSON.stringify(frames));
    expect(keyframes.some(frames => frames.includes('translate'))).toBe(true);
  });

  it('only fades between the steps when the user asks for reduced motion', async () => {
    const animate = vi.mocked(Element.prototype.animate);
    animate.mockClear();
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    await fillAndCreate();
    await startStep();

    const keyframes = animate.mock.calls.map(([frames]) => JSON.stringify(frames));
    expect(keyframes.length).toBeGreaterThan(0);
    expect(keyframes.some(frames => frames.includes('translate'))).toBe(false);
  });
});

describe('CreateAgentDialog: the grant permissions of "One project"', () => {
  const PROJECTS = [
    { id: 'p-1', name: 'prelude' },
    { id: 'p-2', name: 'docs' },
  ];

  const restricted = (scope: PermissionScope, scopeId: string, permissions: Permission[]) => ({
    scope,
    scopeId,
    access: { kind: 'restricted', permissions },
  });

  const grantScopes = (...scopes: ReturnType<typeof restricted>[]) =>
    permissionsStore.setState({ permissions: { scopes } } as never);

  const inOrganization = (...permissions: Permission[]) =>
    restricted(PermissionScope.ORGANIZATION, 'org-1', [
      Permission.CREATE_AGENT,
      Permission.READ_APP,
      Permission.LIST_PROJECTS_BY_ORGANIZATION,
      ...permissions,
    ]);

  const onProject = (projectId: string) =>
    restricted(PermissionScope.PROJECT, projectId, [Permission.MANAGE_PROJECT_GRANTS]);

  beforeEach(() => {
    listProjects.mockResolvedValue(ScyllaResult.success({ projects: PROJECTS }));
  });

  it('lists only the projects where the user may manage the grants, and limits the agent to one', async () => {
    grantScopes(inOrganization(Permission.MANAGE_ORG_GRANTS), onProject('p-2'));
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    expect(await dialog().findByRole('radio', { name: /One project/ })).toBeChecked();
    await userEvent.click(dialog().getByRole('combobox', { name: 'Project' }));
    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options.map(option => option.textContent?.trim())).toEqual(['docs']);
    await userEvent.keyboard('{Escape}');

    await fillAndCreate();
    await startStep();

    expect(createGrant).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'project-agent', scopeId: 'p-2' }),
    );
    expect(revokeGrant).toHaveBeenCalledWith('grant-org');
  });

  it('does not offer one project without MANAGE_PROJECT_GRANTS on a project', async () => {
    grantScopes(inOrganization(Permission.MANAGE_ORG_GRANTS));
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    expect(await dialog().findByRole('radio', { name: 'All projects of Acme' })).toBeChecked();
    await vi.waitFor(() => expect(listProjects).toHaveBeenCalled());
    expect(dialog().queryByRole('radio', { name: /One project/ })).not.toBeInTheDocument();
  });

  it('does not offer one project without MANAGE_ORG_GRANTS, which the removal of the organization grant needs', async () => {
    grantScopes(inOrganization(), onProject('p-1'));
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    expect(await dialog().findByRole('radio', { name: 'All projects of Acme' })).toBeChecked();
    expect(dialog().queryByRole('radio', { name: /One project/ })).not.toBeInTheDocument();

    await fillAndCreate();
    await startStep();

    expect(listProjects).not.toHaveBeenCalled();
    expect(createGrant).not.toHaveBeenCalled();
    expect(listGrants).not.toHaveBeenCalled();
  });
});

describe('CreateAgentDialog: the project list of "One project"', () => {
  const PROJECTS = [{ id: 'p-1', name: 'prelude' }];

  const denied = () =>
    ScyllaResult.error(new ScyllaError('denied', { cause: { code: 'PERMISSION_DENIED' } }));

  const restricted = (scope: PermissionScope, scopeId: string, permissions: Permission[]) => ({
    scope,
    scopeId,
    access: { kind: 'restricted', permissions },
  });

  const grantInOrganization = (...permissions: Permission[]) =>
    permissionsStore.setState({
      permissions: {
        scopes: [
          restricted(PermissionScope.ORGANIZATION, 'org-1', [
            Permission.CREATE_AGENT,
            Permission.READ_APP,
            Permission.MANAGE_ORG_GRANTS,
            ...permissions,
          ]),
          restricted(PermissionScope.PROJECT, 'p-1', [Permission.MANAGE_PROJECT_GRANTS]),
        ],
      },
    } as never);

  const typeName = async () => {
    await focusSettled();
    await userEvent.type(dialog().getByRole('textbox', { name: 'Name' }), 'build-runner-02');
  };

  const createButton = () => dialog().getByRole('button', { name: 'Create agent' });
  const oneProject = () => dialog().getByRole('radio', { name: /One project/ });
  const allProjects = () => dialog().getByRole('radio', { name: 'All projects of Acme' });

  beforeEach(() => grantInOrganization(Permission.LIST_PROJECTS_BY_ORGANIZATION));

  it('waits for the project list, with "Create agent" disabled and nothing wider chosen', async () => {
    const list = deferred<ReturnType<typeof ScyllaResult.success>>();
    listProjects.mockReturnValue(list.promise);
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await typeName();

    expect(dialog().getByRole('status')).toHaveTextContent('Loading the projects…');
    expect(oneProject()).toBeChecked();
    expect(allProjects()).not.toBeChecked();
    expect(createButton()).toBeDisabled();

    list.resolve(ScyllaResult.success({ projects: PROJECTS }));

    expect(await dialog().findByRole('combobox', { name: 'Project' })).toBeInTheDocument();
    expect(createButton()).toBeEnabled();
    await userEvent.click(createButton());
    await startStep();
    expect(createGrant).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'project-agent', scopeId: 'p-1' }),
    );
  });

  it('shows a failed project list with a retry, and chooses no option for the user', async () => {
    listProjects
      .mockResolvedValueOnce(denied())
      .mockResolvedValue(ScyllaResult.success({ projects: PROJECTS }));
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'Scylla could not load the projects.',
    );
    await typeName();
    expect(oneProject()).toBeDisabled();
    expect(oneProject()).not.toBeChecked();
    expect(allProjects()).not.toBeChecked();
    expect(createButton()).toBeDisabled();

    await userEvent.click(dialog().getByRole('button', { name: 'Retry' }));

    expect(await dialog().findByRole('combobox', { name: 'Project' })).toBeInTheDocument();
    expect(oneProject()).toBeChecked();
    expect(createButton()).toBeEnabled();
    expect(createAgent).not.toHaveBeenCalled();
  });

  it('creates the agent for all projects after a failed list only when the user chose it', async () => {
    listProjects.mockResolvedValue(denied());
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await dialog().findByRole('alert');
    await typeName();

    await userEvent.click(allProjects());
    await userEvent.click(dialog().getByText(/^It takes the jobs of one project only/));
    expect(allProjects()).toBeChecked();
    expect(createButton()).toBeEnabled();

    await userEvent.click(createButton());
    await startStep();
    expect(createAgent.mock.lastCall).toEqual(['org-1', 'build-runner-02']);
    expect(createGrant).not.toHaveBeenCalled();
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it('offers all projects at once, with no list, to a user who may not list the projects', async () => {
    grantInOrganization();
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });

    expect(allProjects()).toBeChecked();
    expect(dialog().queryByRole('radio', { name: /One project/ })).not.toBeInTheDocument();
    expect(dialog().queryByRole('status')).not.toBeInTheDocument();

    await fillAndCreate();
    await startStep();
    expect(listProjects).not.toHaveBeenCalled();
    expect(createGrant).not.toHaveBeenCalled();
  });
});

describe('CreateAgentDialog layout', () => {
  it('keeps step 2 inside the body: one column that cannot grow, and steps that can shrink', async () => {
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    const body = screen.getByRole('dialog').querySelector('[data-dialog-part="body"]');
    const grid = body?.firstElementChild;

    expect(body).toHaveClass('min-w-0', 'overflow-clip');
    expect(grid).toHaveClass('grid', 'grid-cols-1');
    expect(grid?.querySelector('[data-step="1"]')).toHaveClass('min-w-0');

    await fillAndCreate();
    await startStep();

    expect(grid?.querySelector('[data-step="2"]')).toHaveClass('min-w-0');
  });

  it('wraps the secret and scrolls each command inside its box, with the copy buttons outside the scroll', async () => {
    createAgent.mockResolvedValue(createdAgent(LONG_SECRET));
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await fillAndCreate();
    await startStep();
    await showSecret();

    const secret = secretBox().querySelector('pre');
    expect(secret).toHaveTextContent(LONG_SECRET);
    expect(secret).toHaveClass('break-all', 'whitespace-pre-wrap');
    expect(secret?.contains(within(secretBox()).getByRole('button', { name: 'Copy' }))).toBe(false);

    for (const method of ['Docker', 'Docker Compose', 'From source']) {
      await userEvent.click(screen.getByRole('radio', { name: method }));
      const pre = commandBox().querySelector('pre');
      expect(pre).toHaveClass('overflow-x-auto', 'whitespace-pre', 'contain-inline-size');
      expect(pre?.textContent).toContain(LONG_SECRET);
      expect(pre?.textContent?.split('\n').length).toBeGreaterThan(4);
      const copy = within(commandBox()).getByRole('button', { name: 'Copy' });
      expect(pre?.contains(copy)).toBe(false);
    }
  });

  it('moves the focus to the copy button of the secret, without a scroll', async () => {
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await focusSettled();
    await userEvent.type(dialog().getByRole('textbox', { name: 'Name' }), 'build-runner-02');
    const create = dialog().getByRole('button', { name: 'Create agent' });
    create.focus();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');

    try {
      await userEvent.click(create);
      await startStep();
      await focusSettled();

      expect(document.activeElement).toBe(
        within(secretBox()).getByRole('button', { name: 'Copy' }),
      );
      expect(focus).toHaveBeenCalled();
      for (const [options] of focus.mock.calls) expect(options).toEqual({ preventScroll: true });
    } finally {
      focus.mockRestore();
    }
  });
});

describe('CreateAgentDialog dismissal', () => {
  const escape = () => userEvent.keyboard('{Escape}');
  const clickOutside = async () => {
    await fireEvent.pointerDown(document.body, { clientX: 2000, clientY: 2000 });
    await new Promise(resolve => setTimeout(resolve, OUTSIDE_CLICK_DEBOUNCE_MS));
  };

  it.each([
    ['Escape', escape],
    ['a click outside', clickOutside],
  ])('closes on %s in step 1', async (_request, request) => {
    const onClose = vi.fn();
    render(CreateAgentDialog, { open: true, onClose });
    await focusSettled();

    await request();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and a click outside in step 2: only its buttons close it', async () => {
    const onClose = vi.fn();
    render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();
    await startStep();

    await escape();
    await clickOutside();

    expect(onClose).not.toHaveBeenCalled();
    expect(secretBox()).toBeInTheDocument();
  });

  it('ignores every close request while the agent is created, and hides the X', async () => {
    const creation = deferred<ReturnType<typeof createdAgent>>();
    createAgent.mockReturnValue(creation.promise);
    const onClose = vi.fn();
    render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();
    expect(dialog().getByRole('button', { name: 'Creating…' })).toBeInTheDocument();

    await escape();
    await clickOutside();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveClass('[&>button]:hidden');

    creation.resolve(createdAgent());
    expect(await startStep()).toBeInTheDocument();
    expect(secretBox()).toBeInTheDocument();
    expect(screen.getByRole('dialog')).not.toHaveClass('[&>button]:hidden');
  });

  it('opens again at step 1, closable, when a creation ends after the dialog went', async () => {
    const creation = deferred<ReturnType<typeof createdAgent>>();
    createAgent.mockReturnValue(creation.promise);
    const onClose = vi.fn();
    const { rerender } = render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();

    await rerender({ open: false });
    creation.resolve(createdAgent());
    await new Promise(resolve => setTimeout(resolve, 0));
    await rerender({ open: true });

    expect(await screen.findByRole('heading', { name: 'New agent' })).toBeInTheDocument();
    await focusSettled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CreateAgentDialog after the close', () => {
  const cachedState = () => {
    const { queryClient } = cache;
    const mutations = queryClient.getMutationCache().getAll();
    const queries = queryClient.getQueryCache().getAll();
    return JSON.stringify([
      ...mutations.map(({ state }) => state),
      ...queries.map(({ state }) => state.data),
    ]);
  };

  const closeStep2 = async () => {
    const onClose = vi.fn();
    const { rerender } = render(CreateAgentDialog, { open: true, onClose });
    await fillAndCreate();
    await startStep();
    await vi.waitFor(() => expect(getAgent).toHaveBeenCalled());
    expect(cachedState()).toContain(SECRET);

    await userEvent.click(dialog().getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
    await rerender({ open: false });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  };

  it('keeps the secret in no mutation and no query of the cache', async () => {
    await closeStep2();

    await vi.waitFor(() => expect(cachedState()).not.toContain(SECRET));
  });

  it('stops the live status', async () => {
    await closeStep2();
    const calls = getAgent.mock.calls.length;
    const live = cache.queryClient.getQueryCache().find({ queryKey: AGENT_QUERY_KEY('agent-new') });

    expect(live?.getObserversCount() ?? 0).toBe(0);
    await new Promise(resolve => setTimeout(resolve, MORE_THAN_ONE_POLL_MS));
    expect(getAgent).toHaveBeenCalledTimes(calls);
  });
});

describe('CreateAgentDialog grant warning', () => {
  it.each([
    ['the organization grants cannot be listed', () => listGrants],
    ['the organization grant cannot be revoked', () => revokeGrant],
  ])('warns that every project stays open when %s', async (_case, failing) => {
    listProjects.mockResolvedValue(
      ScyllaResult.success({ projects: [{ id: 'p-1', name: 'prelude' }] }),
    );
    failing().mockResolvedValue(
      ScyllaResult.error(new ScyllaError('denied', { cause: { code: 'PERMISSION_DENIED' } })),
    );
    render(CreateAgentDialog, { open: true, onClose: vi.fn() });
    await dialog().findByRole('radio', { name: /One project/ });

    await fillAndCreate();
    await startStep();

    expect(secretBox()).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('It can take the jobs of every project');
  });
});
