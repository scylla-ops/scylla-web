import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type * as Utils from '@scylla/ui/utils';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  Permission,
  PermissionScope,
  PrincipalKind,
  permissionsStore,
  type Principal,
} from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, findTooltip, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { APP_ACCESS_QUERY_KEY, type AppAccess } from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import AccessCardFixture from './AccessCard.fixture.svelte';

const toasts = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('@scylla/ui/utils', async importOriginal => ({
  ...(await importOriginal<typeof Utils>()),
  toast: toasts,
}));

const AGENT: AgentEntity = {
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'prelude-deployer',
  isActive: true,
  connected: true,
  lastSeen: '',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
};

const PROJECTS = [
  { id: 'p-1', name: 'prelude' },
  { id: 'p-2', name: 'docs' },
  { id: 'p-3', name: 'infra' },
];

const projectGrant = (projectId: string, overrides: Partial<AppAccess> = {}): AppAccess => ({
  grantId: `grant-${projectId}`,
  scope: 'project',
  scopeId: projectId,
  organizationId: 'org-1',
  organizationName: 'Acme',
  projectName: PROJECTS.find(project => project.id === projectId)?.name ?? '',
  roleId: 'project-agent',
  roleName: 'Project agent',
  ...overrides,
});

const organizationGrant: AppAccess = {
  grantId: 'grant-org',
  scope: 'organization',
  scopeId: 'org-1',
  organizationId: 'org-1',
  organizationName: 'Acme',
  projectName: '',
  roleId: 'organization-agent',
  roleName: 'Organization agent',
};

const systemGrant: AppAccess = {
  grantId: 'grant-system',
  scope: 'system',
  scopeId: '',
  organizationId: null,
  organizationName: '',
  projectName: '',
  roleId: 'system-agent',
  roleName: 'System agent',
};

const globexGrant = projectGrant('p-9', {
  organizationId: 'org-2',
  organizationName: 'Globex',
  projectName: 'site',
});

interface GrantInput {
  principal: Principal;
  roleId: string;
  scope: PermissionScope;
  scopeId: string;
}

const denied = () => new ScyllaError('denied', { code: 'PERMISSION_DENIED' });

/** What the server holds: the grant calls change it, `ListAppAccess` reads it. */
let held: AppAccess[];
let listAppAccess: Mock<(appId: string) => Promise<unknown>>;
let listProjects: Mock<(organizationId: string) => Promise<unknown>>;
let createGrant: Mock<(input: GrantInput) => Promise<unknown>>;
let revokeGrant: Mock<(grantId: string) => Promise<unknown>>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const serverRevoke = (grantId: string) => {
  held = held.filter(grant => grant.grantId !== grantId);
  return Promise.resolve(undefined);
};

const grantPermissions = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  } as never);

type Scope = { scope: PermissionScope; scopeId: string; permissions: Permission[] };

const grantScopes = (...scopes: Scope[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: scopes.map(({ scope, scopeId, permissions }) => ({
        scope,
        scopeId,
        access: { kind: 'restricted', permissions },
      })),
    },
  } as never);

const inOrganization = (...permissions: Permission[]): Scope => ({
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  permissions: [Permission.READ_APP, ...permissions],
});

const onProject = (projectId: string): Scope => ({
  scope: PermissionScope.PROJECT,
  scopeId: projectId,
  permissions: [Permission.MANAGE_PROJECT_GRANTS],
});

const renderCard = (listEntry = false) =>
  render(AccessCardFixture, { agent: AGENT, organizationId: 'org-1', listEntry });

const rows = () => within(screen.getByRole('list', { name: 'Access' })).getAllByRole('listitem');
const rowOf = (name: string) => {
  const row = rows().find(candidate => within(candidate).queryByText(name));
  if (!row) throw new Error(`no access row for ${name}`);
  return row;
};
const dialog = () => within(screen.getByRole('dialog'));
const alertDialog = () => within(screen.getByRole('alertdialog'));

const removeButton = (name: string, role = 'Project agent') =>
  screen.findByRole('button', { name: `Remove access to ${name} (${role})` });

const openGive = async () => {
  const add = await screen.findByRole('button', { name: 'Add access' });
  await vi.waitFor(() => expect(add).toBeEnabled());
  await userEvent.click(add);
  return dialog();
};

const pickAllProjects = async () => {
  await userEvent.click(dialog().getByRole('radio', { name: 'All projects of Acme' }));
};

const KEEPS_JOBS = 'The agent reconnects in a few seconds, and a job that it runs now continues.';
const STRANDS_JOBS =
  'The agent reconnects in a few seconds, and a job that it runs now under this access cannot report its result.';

beforeEach(() => {
  localStorage.setItem('userId', 'ada');
  Object.values(toasts).forEach(toast => toast.mockClear());

  held = [];
  listAppAccess = vi.fn(() => Promise.resolve(held));
  listProjects = vi.fn(() => Promise.resolve<unknown>({ projects: PROJECTS }));
  createGrant = vi.fn((input: GrantInput) => {
    const grant =
      input.scope === PermissionScope.PROJECT
        ? projectGrant(input.scopeId)
        : { ...organizationGrant, grantId: 'grant-new-org' };
    held = [...held, grant];
    return Promise.resolve({ ...input, id: grant.grantId });
  });
  revokeGrant = vi.fn(serverRevoke);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    apps: { appsRepository: { listAppAccess } },
    project: { projectRepository: { getByOrganizationId: listProjects } },
    roles: {
      permissionRepository: {
        createGrant,
        revokeGrant,
        getMyPermissions: () =>
          Promise.resolve(permissionsStore.getState().permissions ?? { scopes: [] }),
      },
    },
  });

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  grantPermissions('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  localStorage.removeItem('userId');
  permissionsStore.setState({ permissions: null });
});

describe('AccessCard: the card', () => {
  it('stays read only for a user who may change no grant', async () => {
    grantPermissions([Permission.READ_APP]);
    held = [projectGrant('p-1')];
    renderCard();

    expect(await screen.findByText('prelude')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add access' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove access/ })).not.toBeInTheDocument();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it('never offers to remove a system grant', async () => {
    held = [systemGrant, projectGrant('p-1')];
    renderCard();

    expect(await removeButton('prelude')).toBeInTheDocument();
    expect(screen.getByText('All organizations')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Remove access to All organizations/ }),
    ).not.toBeInTheDocument();
  });

  it('names each remove button after the access and its role', async () => {
    held = [
      projectGrant('p-1'),
      projectGrant('p-1', {
        grantId: 'grant-p-1-deploy',
        roleId: 'deployer',
        roleName: 'Deployer',
      }),
    ];
    renderCard();

    expect(await removeButton('prelude')).toBeInTheDocument();
    expect(await removeButton('prelude', 'Deployer')).toBeInTheDocument();
  });

  it('shows an empty box for an agent without access, and lets the user give one', async () => {
    renderCard();

    expect(await screen.findByText('No access')).toBeInTheDocument();
    expect(
      screen.getByText('This agent takes no job. Give it one project or all the projects.'),
    ).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add access' })).toBeEnabled(),
    );
  });

  it('marks Add access aria-disabled while the agent takes every project, and says why', async () => {
    held = [organizationGrant];
    renderCard();

    await screen.findByText('All projects');
    const add = screen.getByRole('button', { name: 'Add access' });
    expect(add).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(add);
    expect(await findTooltip()).toHaveTextContent('It already takes the jobs of every project.');
  });

  it('shows an error with a retry when the access does not load', async () => {
    listAppAccess.mockRejectedValueOnce(denied()).mockImplementation(() => Promise.resolve(held));
    held = [projectGrant('p-1')];
    renderCard();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Scylla could not load the access of this agent.',
    );
    expect(screen.getByRole('button', { name: 'Add access' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await removeButton('prelude')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says that the access is hidden when the query cannot run, rather than load forever', async () => {
    grantScopes({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      permissions: [Permission.MANAGE_ORG_GRANTS],
    });
    renderCard();

    expect(await screen.findByText('You cannot see the access of this agent.')).toBeInTheDocument();
    expect(listAppAccess).not.toHaveBeenCalled();
  });
});

describe('AccessCard: give access', () => {
  it('lays out the give dialog like the other agent dialogs', async () => {
    held = [projectGrant('p-1')];
    renderCard();
    await openGive();

    const parts = [...screen.getByRole('dialog').querySelectorAll('[data-dialog-part]')].map(part =>
      part.getAttribute('data-dialog-part'),
    );
    expect(parts).toEqual(['header', 'body', 'footer']);
    expect(
      dialog().getByRole('heading', { name: 'Give access to prelude-deployer' }),
    ).toBeVisible();
  });

  it('gives one project, chosen among the projects without access', async () => {
    held = [projectGrant('p-1')];
    renderCard();
    const give = await openGive();

    expect(await give.findByRole('radio', { name: 'One project' })).toBeChecked();
    expect(
      give.getByText(
        'Role: Project agent. It can take jobs and report their status, nothing more.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(give.getByRole('combobox', { name: 'Project' }));
    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options.map(option => option.textContent?.trim())).toEqual(['docs', 'infra']);
    await userEvent.click(await findFloating('option', 'infra'));
    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() =>
      expect(createGrant).toHaveBeenCalledWith({
        principal: { kind: PrincipalKind.APP, id: 'agent-1' },
        roleId: 'project-agent',
        scope: PermissionScope.PROJECT,
        scopeId: 'p-3',
      }),
    );
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(rowOf('infra')).toHaveAttribute('data-fresh');
    expect(rowOf('prelude')).not.toHaveAttribute('data-fresh');
    expect(
      screen.getByText('It takes the jobs of these 2 projects only, and reads only their secrets.'),
    ).toBeInTheDocument();
    expect(toasts.success).toHaveBeenCalledWith('Access given', {
      description: 'prelude-deployer can take the jobs of infra.',
    });
  });

  it('gives every project, then revokes the project access of this organization it replaces', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2'), globexGrant];
    renderCard();
    const give = await openGive();

    await pickAllProjects();
    expect(
      give.getByText(`This access replaces the access to prelude and docs. ${KEEPS_JOBS}`),
    ).toBeInTheDocument();
    expect(give.getByText(/^Role: Organization agent\./)).toBeInTheDocument();

    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createGrant).toHaveBeenCalledWith({
      principal: { kind: PrincipalKind.APP, id: 'agent-1' },
      roleId: 'organization-agent',
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
    });
    expect(revokeGrant.mock.calls).toEqual([['grant-p-1'], ['grant-p-2']]);
    expect(createGrant.mock.invocationCallOrder[0]).toBeLessThan(
      revokeGrant.mock.invocationCallOrder[0],
    );
    expect(rowOf('All projects')).toHaveAttribute('data-fresh');
    expect(rowOf('Globex / site')).toBeInTheDocument();
    expect(screen.queryByText('prelude')).not.toBeInTheDocument();
    expect(toasts.success).toHaveBeenCalledWith('Access given', {
      description: 'prelude-deployer can take the jobs of every project of Acme.',
    });
  });

  it('gives the focus back to Add access after "All projects", though it is now denied', async () => {
    renderCard();
    await openGive();

    await pickAllProjects();
    await userEvent.click(dialog().getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const add = screen.getByRole('button', { name: 'Add access' });
    expect(add).toHaveAttribute('aria-disabled', 'true');
    await vi.waitFor(() => expect(add).toHaveFocus());
  });

  it('keeps the new organization access and warns when a replaced access cannot go', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2')];
    revokeGrant.mockImplementation(grantId =>
      grantId === 'grant-p-2' ? Promise.reject(denied()) : serverRevoke(grantId),
    );
    renderCard();
    await openGive();

    await pickAllProjects();
    await userEvent.click(dialog().getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() =>
      expect(toasts.warning).toHaveBeenCalledWith('Access given', {
        description:
          'prelude-deployer can take the jobs of every project of Acme. Scylla could not remove the access to docs: remove it in the Access card.',
      }),
    );
    expect(revokeGrant).not.toHaveBeenCalledWith('grant-new-org');
    expect(toasts.success).not.toHaveBeenCalled();
    expect(rowOf('All projects')).toBeInTheDocument();
    expect(rowOf('docs')).toBeInTheDocument();
  });

  it('keeps the give dialog open and usable when the grant fails', async () => {
    createGrant.mockRejectedValue(denied());
    renderCard();
    const give = await openGive();
    await give.findByRole('combobox', { name: 'Project' });

    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(createGrant).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(dialog().getByRole('button', { name: 'Give access' })).toBeEnabled(),
    );
    expect(dialog().getByRole('radio', { name: 'One project' })).toBeEnabled();
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it('gives only once on a double click', async () => {
    renderCard();
    const give = await openGive();
    await give.findByRole('combobox', { name: 'Project' });

    await userEvent.dblClick(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createGrant).toHaveBeenCalledOnce();
  });
});

describe('AccessCard: the project list of the give dialog', () => {
  it('waits for the project list, with Give disabled and nothing else chosen', async () => {
    listProjects.mockImplementation(() => new Promise(() => {}));
    renderCard();
    const give = await openGive();

    expect(give.getByRole('status')).toHaveTextContent('Loading the projects…');
    expect(give.getByRole('radio', { name: 'All projects of Acme' })).not.toBeChecked();
    expect(give.getByRole('button', { name: 'Give access' })).toBeDisabled();
  });

  it('shows a failed project list with a retry, and never falls back to every project', async () => {
    listProjects.mockRejectedValueOnce(denied()).mockResolvedValue({ projects: PROJECTS });
    renderCard();
    const give = await openGive();

    expect(await give.findByRole('alert')).toHaveTextContent('Scylla could not load the projects.');
    expect(give.getByRole('radio', { name: 'All projects of Acme' })).not.toBeChecked();
    expect(give.getByRole('button', { name: 'Give access' })).toBeDisabled();

    await userEvent.click(give.getByRole('button', { name: 'Retry' }));

    expect(await give.findByRole('combobox', { name: 'Project' })).toBeInTheDocument();
    expect(give.getByRole('button', { name: 'Give access' })).toBeEnabled();
    expect(createGrant).not.toHaveBeenCalled();
  });

  it('says that the user cannot list the projects, and lets them choose every project', async () => {
    grantScopes(inOrganization(Permission.MANAGE_ORG_GRANTS, Permission.MANAGE_PROJECT_GRANTS));
    renderCard();
    const give = await openGive();

    expect(give.getByText('You cannot see the projects of this organization.')).toBeInTheDocument();
    expect(give.getByRole('radio', { name: 'One project' })).toBeDisabled();
    expect(give.getByRole('radio', { name: 'All projects of Acme' })).not.toBeChecked();
    expect(give.getByRole('button', { name: 'Give access' })).toBeDisabled();

    await pickAllProjects();

    expect(give.getByRole('button', { name: 'Give access' })).toBeEnabled();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it('says that there is no project left only when the list loaded empty', async () => {
    held = PROJECTS.map(project => projectGrant(project.id));
    renderCard();
    const give = await openGive();

    expect(await give.findByText('There is no project without access.')).toBeInTheDocument();
    expect(give.getByRole('radio', { name: 'All projects of Acme' })).not.toBeChecked();
  });

  it('says when the list of projects is cut', async () => {
    listProjects.mockResolvedValue({ projects: PROJECTS, pagination: { totalCount: 150 } });
    renderCard();
    const give = await openGive();

    expect(await give.findByText('The list shows the first 3 projects only.')).toBeInTheDocument();
  });
});

describe('AccessCard: a user with some grant permissions only', () => {
  it('without MANAGE_PROJECT_GRANTS: no project, no X on a project, and the project access stay', async () => {
    grantScopes(
      inOrganization(Permission.LIST_PROJECTS_BY_ORGANIZATION, Permission.MANAGE_ORG_GRANTS),
    );
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();

    await screen.findByText('prelude');
    expect(screen.queryByRole('button', { name: /^Remove access/ })).not.toBeInTheDocument();
    const give = await openGive();

    expect(
      await give.findByText('You cannot give access to the other projects.'),
    ).toBeInTheDocument();
    expect(give.getByRole('radio', { name: 'One project' })).toBeDisabled();
    expect(give.queryByRole('combobox', { name: 'Project' })).not.toBeInTheDocument();

    await pickAllProjects();
    expect(
      give.getByText('The access to prelude and docs stays: you cannot remove it.'),
    ).toBeInTheDocument();
    expect(give.queryByText(/replaces the access/)).not.toBeInTheDocument();

    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createGrant).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'organization-agent', scopeId: 'org-1' }),
    );
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it('with MANAGE_PROJECT_GRANTS on some projects: only these, and never every project', async () => {
    grantScopes(
      inOrganization(Permission.LIST_PROJECTS_BY_ORGANIZATION),
      onProject('p-1'),
      onProject('p-3'),
    );
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();

    expect(await removeButton('prelude')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Remove access to docs/ }),
    ).not.toBeInTheDocument();
    const give = await openGive();

    expect(give.getByRole('radio', { name: 'All projects of Acme' })).toBeDisabled();
    expect(give.getByText('You cannot give access to all the projects.')).toBeInTheDocument();
    await userEvent.click(await give.findByRole('combobox', { name: 'Project' }));
    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options.map(option => option.textContent?.trim())).toEqual(['infra']);
    await userEvent.click(await findFloating('option', 'infra'));
    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() =>
      expect(createGrant).toHaveBeenCalledWith(expect.objectContaining({ scopeId: 'p-3' })),
    );
  });

  it('revokes only the replaced access that the user may revoke', async () => {
    grantScopes(
      inOrganization(Permission.LIST_PROJECTS_BY_ORGANIZATION, Permission.MANAGE_ORG_GRANTS),
      onProject('p-1'),
    );
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();
    const give = await openGive();

    await pickAllProjects();
    expect(
      give.getByText(`This access replaces the access to prelude. ${KEEPS_JOBS}`),
    ).toBeInTheDocument();
    expect(give.getByText('The access to docs stays: you cannot remove it.')).toBeInTheDocument();

    await userEvent.click(give.getByRole('button', { name: 'Give access' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(revokeGrant.mock.calls).toEqual([['grant-p-1']]);
    expect(toasts.warning).not.toHaveBeenCalled();
  });

  it('without MANAGE_ORG_GRANTS: no X on the organization grant', async () => {
    grantScopes(inOrganization(Permission.LIST_PROJECTS_BY_ORGANIZATION), onProject('p-1'));
    held = [organizationGrant, projectGrant('p-1')];
    renderCard();

    expect(await removeButton('prelude')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Remove access to All projects/ }),
    ).not.toBeInTheDocument();
  });
});

describe('AccessCard: remove access', () => {
  it('says which access goes and which stay, and removes only after the confirmation', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();

    await userEvent.click(await removeButton('prelude'));

    const confirm = alertDialog();
    expect(confirm.getByRole('heading', { name: 'Remove access to prelude?' })).toBeVisible();
    expect(
      confirm.getByText(
        'prelude-deployer stops taking the jobs of prelude, and stops reading its secrets.',
      ),
    ).toBeInTheDocument();
    const changes = within(confirm.getByRole('list', { name: 'What changes' }));
    const [removed, kept] = changes.getAllByRole('listitem');
    expect(within(removed).getByText('prelude')).toBeInTheDocument();
    expect(within(removed).getByText('Loses')).toBeInTheDocument();
    expect(within(kept).getByText('docs')).toBeInTheDocument();
    expect(within(kept).getByText('Keeps')).toBeInTheDocument();
    expect(confirm.getByText(STRANDS_JOBS)).toBeInTheDocument();
    expect(confirm.queryByText(/It then takes no job\./)).not.toBeInTheDocument();
    expect(revokeGrant).not.toHaveBeenCalled();

    await userEvent.click(confirm.getByRole('button', { name: 'Remove access' }));

    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(revokeGrant).toHaveBeenCalledWith('grant-p-1');
    expect(rows()).toHaveLength(1);
    expect(
      screen.getByText('It takes the jobs of docs only, and reads only the secrets of docs.'),
    ).toBeInTheDocument();
    expect(toasts.success).toHaveBeenCalledWith('Access removed', {
      description: 'prelude-deployer no longer takes the jobs of prelude.',
    });
  });

  it('says that a running job continues when another access still covers it', async () => {
    held = [organizationGrant, projectGrant('p-1')];
    renderCard();

    await userEvent.click(await removeButton('prelude'));

    expect(alertDialog().getByText(KEEPS_JOBS)).toBeInTheDocument();
  });

  it('gives the focus to the card heading, as the X that opened the dialog is gone', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();

    await userEvent.click(await removeButton('prelude'));
    await userEvent.click(alertDialog().getByRole('button', { name: 'Remove access' }));

    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await vi.waitFor(() => expect(screen.getByRole('heading', { name: 'Access' })).toHaveFocus());
  });

  it('warns before it removes the last access, then shows that the agent takes no job', async () => {
    held = [organizationGrant];
    renderCard();

    await userEvent.click(await removeButton('All projects', 'Organization agent'));
    const confirm = alertDialog();
    expect(
      confirm.getByRole('heading', { name: 'Remove access to all projects of Acme?' }),
    ).toBeVisible();
    expect(confirm.getByText(/It then takes no job\./)).toBeInTheDocument();

    await userEvent.click(confirm.getByRole('button', { name: 'Remove access' }));

    expect(await screen.findByText('No access')).toBeInTheDocument();
    expect(revokeGrant).toHaveBeenCalledWith('grant-org');
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add access' })).toBeEnabled(),
    );
    expect(toasts.success).toHaveBeenCalledWith('Access removed', {
      description: 'prelude-deployer no longer takes the jobs of every project of Acme.',
    });
  });

  it('keeps the remove dialog open and usable when the revoke fails', async () => {
    held = [projectGrant('p-1')];
    revokeGrant.mockRejectedValue(denied());
    renderCard();

    await userEvent.click(await removeButton('prelude'));
    await userEvent.click(alertDialog().getByRole('button', { name: 'Remove access' }));

    await vi.waitFor(() => expect(revokeGrant).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(alertDialog().getByRole('button', { name: 'Remove access' })).toBeEnabled(),
    );
    expect(rowOf('prelude')).toBeInTheDocument();
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it('removes only once on a double click', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard();

    await userEvent.click(await removeButton('prelude'));
    await userEvent.dblClick(alertDialog().getByRole('button', { name: 'Remove access' }));

    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(revokeGrant).toHaveBeenCalledOnce();
  });

  it('refreshes the entry that the agents list reads, without a reload', async () => {
    held = [projectGrant('p-1'), projectGrant('p-2')];
    renderCard(true);
    const entry = within(screen.getByTestId('list-entry'));
    expect(await entry.findByText('prelude')).toBeInTheDocument();
    expect(entry.getByText('+1')).toBeInTheDocument();

    await userEvent.click(await removeButton('prelude'));
    await userEvent.click(alertDialog().getByRole('button', { name: 'Remove access' }));

    expect(await entry.findByText('docs')).toBeInTheDocument();
    expect(entry.queryByText('prelude')).not.toBeInTheDocument();
    expect(entry.queryByText('+1')).not.toBeInTheDocument();
    expect(listAppAccess).toHaveBeenCalledTimes(2);
    expect(cache.queryClient.getQueryData(APP_ACCESS_QUERY_KEY('agent-1'))).toEqual([
      projectGrant('p-2'),
    ]);
  });
});
