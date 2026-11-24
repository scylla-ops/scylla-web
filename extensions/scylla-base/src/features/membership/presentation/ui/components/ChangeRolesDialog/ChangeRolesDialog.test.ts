import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { MemberRoleEntity } from '@base/features/access';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import ChangeRolesDialog from './ChangeRolesDialog.svelte';

const roleOption = (key: string, overrides = {}) => ({
  key,
  name: key,
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: key,
  builtin: false,
  fullControl: false,
  permissions: [] as string[],
  holderCount: 0,
  ...overrides,
});

const held = (role: string, overrides: Partial<MemberRoleEntity> = {}): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w-1',
  scopeName: 'Acme',
  role,
  roleKey: role,
  roleName: role,
  ...overrides,
});

const secretsArea = {
  id: 'secrets',
  permissions: [{ id: 'secrets.delete', action: 'delete', level: 'workspace', holders: ['people'] }],
};

const agent = roleOption('agent', { name: 'Agent', holder: 'apps', grantName: 'runner', builtin: true });
const deployer = roleOption('deployer', { holder: 'apps' });

let grant: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const setUp = (options: unknown[], permissions: string[] = []) => {
  const cache = withQueryClient();
  const restore = withRegistry({
    access: {
      accessRepository: {
        grant,
        revoke,
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set(permissions)),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([secretsArea]),
        list: vi.fn().mockResolvedValue(options),
      },
    },
  });
  teardown = [cache.restore, restore];
};

const baseProps = {
  actorId: 'user-1',
  holder: 'people' as const,
  name: 'test',
  scopeName: 'Acme',
  roles: [] as MemberRoleEntity[],
  workspaceId: 'w-1',
  object: { kind: 'workspace', id: 'w-1' } as const,
  onClose: vi.fn(),
  onChanged: vi.fn<() => unknown>(),
};

const box = (name: string) => screen.findByRole('checkbox', { name });

const refused = () =>
  new ScyllaError('you do not hold it', {
    code: 'FAILED_PRECONDITION',
    reason: 'ESCALATION',
    raw: true,
  });

beforeEach(() => {
  grant = vi.fn().mockResolvedValue(undefined);
  revoke = vi.fn().mockResolvedValue(undefined);
  baseProps.onChanged = vi.fn<() => unknown>();
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('ChangeRolesDialog', () => {
  describe('the rows', () => {
    it('shows each role that the actor can get, with its description, and ticks the held ones', async () => {
      setUp([
        roleOption('workspace-member', { name: 'Workspace member', builtin: true }),
        roleOption('workspace-viewer', { name: 'Workspace viewer', builtin: true }),
      ]);

      render(ChangeRolesDialog, { ...baseProps, roles: [held('workspace-member')] });

      expect(await box('Workspace member')).toBeChecked();
      expect(await box('Workspace viewer')).not.toBeChecked();
      expect(screen.getByText(/Works in every project of the workspace/)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Roles in Acme' })).toBeInTheDocument();
    });

    it('shows only the roles of the level of the object and of the kind of the actor', async () => {
      setUp([
        roleOption('here'),
        roleOption('on-project', { level: 'project' }),
        roleOption('for-apps', { holder: 'apps' }),
      ]);

      render(ChangeRolesDialog, baseProps);

      expect(await box('here')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'on-project' })).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'for-apps' })).not.toBeInTheDocument();
    });

    it('locks a role that the caller cannot give, and says why', async () => {
      setUp([roleOption('release', { permissions: ['secrets.delete'] })]);

      render(ChangeRolesDialog, baseProps);

      const row = await box('release');
      expect(row).toBeDisabled();
      expect(row).toHaveAccessibleDescription(/^Locked\./);
    });

    it('keeps a held role in the list when the list of roles does not have it', async () => {
      setUp([]);

      render(ChangeRolesDialog, { ...baseProps, roles: [held('old-role')] });

      expect(await box('old-role')).toBeChecked();
    });

    it('locks the role owner for a caller with no right on the owners, and says why', async () => {
      permissionsStore.setState({
        permissions: {
          scopes: [
            {
              scope: PermissionScope.SYSTEM,
              scopeId: '',
              access: { kind: 'restricted', permissions: [Permission.MANAGE_WORKSPACE_GRANTS] },
            },
          ],
        },
      });
      setUp([roleOption('owner', { name: 'Workspace owner', builtin: true })]);

      render(ChangeRolesDialog, { ...baseProps, roles: [held('owner')] });

      const row = await box('Workspace owner');
      expect(row).toBeChecked();
      expect(row).toBeDisabled();
      expect(row).toHaveAccessibleDescription(/Only an owner/);
    });

    it('takes back the role owner as any other role', async () => {
      setUp([roleOption('owner', { name: 'Workspace owner', builtin: true })]);

      render(ChangeRolesDialog, { ...baseProps, roles: [held('owner'), held('member')] });

      await userEvent.click(await box('Workspace owner'));

      await vi.waitFor(() =>
        expect(revoke).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'owner', 'user-1'),
      );
    });

    it('shows the refusal for the last owner on its row', async () => {
      revoke = vi.fn().mockRejectedValue(
        new ScyllaError('a workspace keeps its last owner', {
          code: 'FAILED_PRECONDITION',
          reason: 'LAST_OWNER',
        }),
      );
      setUp([roleOption('owner', { name: 'Workspace owner', builtin: true })]);

      render(ChangeRolesDialog, { ...baseProps, roles: [held('owner'), held('member')] });

      await userEvent.click(await box('Workspace owner'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The workspace needs at least one other owner',
      );
    });

    it('says that there is no role when the list of roles is empty', async () => {
      setUp([]);

      render(ChangeRolesDialog, baseProps);

      expect(await screen.findByText('No role')).toBeInTheDocument();
    });
  });

  describe('a change', () => {
    it('gives the role with one click', async () => {
      setUp([agent]);
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps' });

      await userEvent.click(await box('Agent'));

      await vi.waitFor(() =>
        expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'runner', 'app-1'),
      );
    });

    it('takes the role back with one click when it is not the last one', async () => {
      setUp([roleOption('one'), roleOption('two')]);
      render(ChangeRolesDialog, { ...baseProps, roles: [held('one'), held('two')] });

      await userEvent.click(await box('one'));

      await vi.waitFor(() =>
        expect(revoke).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'one', 'user-1'),
      );
    });

    it('ticks the row at once, and ignores another click until the reload ends', async () => {
      setUp([agent, deployer]);
      let reloaded = () => {};
      const onChanged = vi.fn(() => new Promise<void>(resolve => (reloaded = resolve)));
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps', onChanged });

      const first = await box('Agent');
      const second = await box('deployer');
      await userEvent.click(first);
      await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());

      expect(first).toBeChecked();
      expect(second).toHaveAttribute('aria-readonly', 'true');
      await userEvent.click(second);
      expect(second).not.toBeChecked();
      expect(grant).toHaveBeenCalledTimes(1);

      reloaded();

      await vi.waitFor(() => expect(second).not.toHaveAttribute('aria-readonly', 'true'));
    });

    it('shows no toast: the row shows the change', async () => {
      const success = vi.spyOn(toast, 'success');
      setUp([agent]);
      const onChanged = vi.fn();
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps', onChanged });

      await userEvent.click(await box('Agent'));
      await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());

      expect(success).not.toHaveBeenCalled();
      success.mockRestore();
    });
  });

  describe('a refusal', () => {
    it('puts the row back, and shows the reason of the server on it', async () => {
      grant = vi.fn().mockRejectedValue(refused());
      setUp([agent]);
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps' });

      const row = await box('Agent');
      await userEvent.click(row);

      const alert = await screen.findByRole('alert');
      expect(row).not.toBeChecked();
      expect(alert.closest('li')).toContainElement(row);
    });

    it('lets the user try again', async () => {
      grant = vi.fn().mockRejectedValueOnce(refused()).mockResolvedValue(undefined);
      setUp([agent]);
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps' });

      const row = await box('Agent');
      await userEvent.click(row);
      await screen.findByRole('alert');
      await userEvent.click(row);

      await vi.waitFor(() => expect(grant).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });

    it('does not stay for the next opening', async () => {
      grant = vi.fn().mockRejectedValue(refused());
      setUp([agent]);
      const { rerender } = render(ChangeRolesDialog, {
        ...baseProps,
        actorId: 'app-1',
        holder: 'apps',
      });

      await userEvent.click(await box('Agent'));
      await screen.findByRole('alert');
      await rerender({ actorId: undefined });
      await rerender({ actorId: 'app-2' });

      await box('Agent');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('leaves an app of another workspace to its own dialog', async () => {
      const onOutside = vi.fn();
      grant = vi.fn().mockRejectedValue(
        new ScyllaError('an app gets roles only in its own workspace', {
          code: 'FAILED_PRECONDITION',
          reason: 'ACTOR_OUTSIDE_WORKSPACE',
          raw: true,
        }),
      );
      setUp([agent]);
      render(ChangeRolesDialog, { ...baseProps, actorId: 'app-1', holder: 'apps', onOutside });

      await userEvent.click(await box('Agent'));

      await vi.waitFor(() => expect(onOutside).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('goes to a toast when the dialog closed during the save', async () => {
      const error = vi.spyOn(toast, 'error');
      let refuse = (_reason: unknown) => {};
      grant = vi.fn(() => new Promise((_resolve, reject) => (refuse = reject)));
      setUp([agent]);
      const { unmount } = render(ChangeRolesDialog, {
        ...baseProps,
        actorId: 'app-1',
        holder: 'apps',
      });

      await userEvent.click(await box('Agent'));
      await vi.waitFor(() => expect(grant).toHaveBeenCalled());
      unmount();
      refuse(refused());

      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      error.mockRestore();
    });
  });

  describe('the last workspace role of a person', () => {
    const lastRole = async () => {
      setUp([roleOption('member')]);
      render(ChangeRolesDialog, { ...baseProps, roles: [held('member')] });
      const row = await box('member');
      await userEvent.click(row);
      return row;
    };

    it('asks first, and says that the person leaves the workspace', async () => {
      const row = await lastRole();

      expect(revoke).not.toHaveBeenCalled();
      expect(row).toBeChecked();
      expect(screen.getByText(/last role of test in Acme/)).toBeInTheDocument();
    });

    it('keeps the role with Keep', async () => {
      await lastRole();

      await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

      expect(revoke).not.toHaveBeenCalled();
      expect(screen.queryByText(/last role of test in Acme/)).not.toBeInTheDocument();
    });

    it('closes the question with a second click on the box', async () => {
      const row = await lastRole();

      await userEvent.click(row);

      expect(revoke).not.toHaveBeenCalled();
      expect(screen.queryByText(/last role of test in Acme/)).not.toBeInTheDocument();
    });

    it('takes the role back after the confirmation', async () => {
      await lastRole();

      await userEvent.click(screen.getByRole('button', { name: 'Remove from Acme' }));

      await vi.waitFor(() =>
        expect(revoke).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'member', 'user-1'),
      );
    });

    it.each([
      { name: 'an app, which the server keeps in its projects', holder: 'apps', kind: 'workspace' },
      { name: 'a role of a project', holder: 'people', kind: 'project' },
    ] as const)('does not ask for $name', async ({ holder, kind }) => {
      setUp([roleOption('one', { level: kind, holder })]);
      render(ChangeRolesDialog, {
        ...baseProps,
        holder,
        object: { kind, id: 'x-1' },
        roles: [held('one', { scopeKind: kind })],
      });

      await userEvent.click(await box('one'));

      await vi.waitFor(() => expect(revoke).toHaveBeenCalled());
    });

    it('does not ask for a person who is also an owner: that person stays', async () => {
      setUp([roleOption('member')]);
      render(ChangeRolesDialog, {
        ...baseProps,
        roles: [held('member'), held('owner', { roleKey: 'owner' })],
      });

      await userEvent.click(await box('member'));

      await vi.waitFor(() => expect(revoke).toHaveBeenCalled());
    });
  });

  describe('the roles of other scopes', () => {
    let navigator: ReturnType<typeof installTestNavigator>;
    const apiRole = (role: string, roleName: string) =>
      held(role, { scopeKind: 'project', scopeId: 'p-1', scopeName: 'api', roleName });

    beforeEach(() => {
      navigator = installTestNavigator();
      contextStore.setState({
        workspace: { id: 'w-1', name: 'Acme', slug: 'acme' },
        project: { id: null, name: null },
      });
    });

    afterEach(() => navigator.restore());

    it('groups them by scope, with no box', async () => {
      setUp([]);
      render(ChangeRolesDialog, {
        ...baseProps,
        otherRoles: [apiRole('editor', 'Editor'), apiRole('viewer', 'Viewer')],
      });

      const group = (await screen.findByRole('heading', { name: 'Roles on projects' }))
        .parentElement as HTMLElement;
      expect(within(group).getByText('Editor, Viewer')).toBeInTheDocument();
      expect(within(group).queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('sends a project role to the members of its project, and closes', async () => {
      const onClose = vi.fn();
      setUp([]);
      render(ChangeRolesDialog, {
        ...baseProps,
        onClose,
        otherRoles: [apiRole('editor', 'Editor')],
      });

      await userEvent.click(await screen.findByRole('button', { name: 'Change in api' }));

      expect(onClose).toHaveBeenCalled();
      expect(contextStore.getState().project).toEqual({ id: 'p-1', name: 'api' });
      expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/p-1/members', undefined);
    });

    it('sends a workspace role to the members of the workspace, from a project', async () => {
      setUp([]);
      render(ChangeRolesDialog, {
        ...baseProps,
        scopeName: 'api',
        object: { kind: 'project', id: 'p-1' },
        otherRoles: [held('viewer')],
      });

      expect(
        await screen.findByRole('heading', { name: 'Roles from the workspace' }),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Change in Acme' }));

      expect(navigator.navigate).toHaveBeenCalledWith('/acme/access/members', undefined);
    });
  });
});
