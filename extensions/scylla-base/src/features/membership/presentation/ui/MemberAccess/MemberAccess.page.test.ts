import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { MemberEntity } from '@base/features/access';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
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
let memberAccess: ReturnType<typeof vi.fn>;

beforeEach(() => {
  let current: MemberEntity | undefined = bob;
  const navigator = installTestNavigator({
    pathname: '/acme/access/members/user-2',
    params: { actorId: 'user-2' },
  });
  navigate = navigator.navigate;
  memberAccess = vi.fn(() =>
    Promise.resolve({ member: current, sources: new Map<string, never>() }),
  );

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    access: {
      accessRepository: {
        memberAccess,
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
      projectRepository: {
        lookup: vi.fn().mockResolvedValue({ items: [] }),
        getByWorkspaceId: vi.fn().mockResolvedValue({
          items: [
            { id: 'p-1', name: 'api' },
            { id: 'p-2', name: 'web' },
          ],
        }),
      },
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
  it('ends with a space under the last card, above a floating button at the bottom right', async () => {
    const { container } = render(MemberAccessPage);

    await screen.findByRole('button', { name: 'Change roles' });

    expect(container.firstElementChild).toHaveClass('pb-20');
  });

  it('keeps the dialog open when the last role goes, and goes to the list on close', async () => {
    render(MemberAccessPage);

    await userEvent.click(await screen.findByRole('button', { name: 'Change roles' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      await within(dialog).findByRole('checkbox', { name: 'Workspace member' }),
    );
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

describe('MemberAccess scope', () => {
  const scope = () =>
    screen.findByRole<HTMLInputElement>('combobox', { name: 'The scope of the access' });

  it('starts on the workspace, and finds a project by its name', async () => {
    render(MemberAccessPage);
    const field = await scope();
    expect(field.value).toContain('Acme');

    await userEvent.type(field, 'web{Enter}');

    await waitFor(() =>
      expect(memberAccess).toHaveBeenLastCalledWith('user-2', { kind: 'project', id: 'p-2' }),
    );
    expect((await scope()).value).toContain('web');
  });

  it('goes back to the workspace with the keyboard: its row has a value that Enter can pick', async () => {
    render(MemberAccessPage);
    await userEvent.type(await scope(), 'web{Enter}');
    // The page shows a skeleton while it reads the new scope: the field is a new element.
    await waitFor(() =>
      expect(memberAccess).toHaveBeenLastCalledWith('user-2', { kind: 'project', id: 'p-2' }),
    );

    const field = await scope();
    await userEvent.clear(field);
    await userEvent.type(field, 'acme');
    await findFloating('option', 'Workspace · Acme');
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(memberAccess).toHaveBeenLastCalledWith('user-2', { kind: 'workspace', id: 'org-1' }),
    );
  });
});
