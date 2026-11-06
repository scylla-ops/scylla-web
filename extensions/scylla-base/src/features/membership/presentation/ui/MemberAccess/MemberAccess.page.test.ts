import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { MemberEntity } from '@base/features/access';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import MemberAccessPage from './MemberAccess.page.svelte';

const bob: MemberEntity = {
  actorId: 'user-2',
  actorKind: 'user',
  displayName: 'Bob',
  handle: 'bob',
  roles: [
    {
      scopeKind: 'workspace',
      scopeId: 'org-1',
      scopeName: 'Acme',
      role: 'member',
      roleKey: 'workspace-member',
      roleName: 'Workspace member',
    },
  ],
};

let teardown: Array<() => void> = [];
let navigate: ReturnType<typeof installTestNavigator>['navigate'];

beforeEach(() => {
  let current: MemberEntity | undefined = bob;
  const navigator = installTestNavigator({
    pathname: '/acme/access/members/user-2',
    params: { actorId: 'user-2' },
  });
  navigate = navigator.navigate;

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    access: {
      accessRepository: {
        memberAccess: vi.fn(() =>
          Promise.resolve({ member: current, sources: new Map<string, never>() }),
        ),
        grant: vi.fn(),
        revoke: vi.fn(() => {
          current = undefined;
          return Promise.resolve();
        }),
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set()),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([]),
        list: vi.fn().mockResolvedValue([]),
      },
    },
    project: {
      projectRepository: { lookup: vi.fn().mockResolvedValue({ items: [] }) },
    },
  });
  teardown = [navigator.restore, cache.restore, restoreRegistry];

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
  });
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

describe('MemberAccessPage', () => {
  it('keeps the dialog open when the last role goes, and goes to the list on close', async () => {
    render(MemberAccessPage);

    await userEvent.click(await screen.findByRole('button', { name: 'Change roles' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Workspace member' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove from Acme' }));

    await vi.waitFor(() =>
      expect(
        within(dialog).queryByRole('checkbox', { name: 'Workspace member' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Change the roles of Bob');
    expect(navigate).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');

    expect(navigate).toHaveBeenCalledWith('/acme/access/members', undefined);
  });
});
