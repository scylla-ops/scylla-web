import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { toast } from '@scylla/ui/utils';
import type { AccessEntryEntity } from '@base/features/access';
import { MemberRoleOrigin } from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import type { MemberRole } from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import { createScopeMembership } from '../scope-membership.state.svelte.ts';

vi.mock('svelte-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const toastSuccess = vi.mocked(toast.success);
const project = { kind: 'project', id: 'project-1' };

const entry = (overrides: Partial<AccessEntryEntity> = {}): AccessEntryEntity => ({
  actorId: 'user-1',
  actorKind: 'user',
  displayName: 'Alice',
  handle: 'alice',
  role: 'editor',
  ...overrides,
});

let listAccess: ReturnType<typeof vi.fn>;
let grant: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  toastSuccess.mockClear();

  listAccess = vi.fn().mockResolvedValue([]);
  grant = vi.fn().mockResolvedValue(undefined);
  revoke = vi.fn().mockResolvedValue(undefined);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    access: {
      accessRepository: { listAccess, grant, revoke, check: vi.fn().mockResolvedValue(new Set()) },
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

const withMembership = async (
  overrides: { scopeId?: string | null; onMembershipChanged?: () => void } = {},
  body: (state: ReturnType<typeof createScopeMembership>) => Promise<void> | void = () => {},
) => {
  const { scopeId = 'project-1', onMembershipChanged = vi.fn() } = overrides;
  let state!: ReturnType<typeof createScopeMembership>;

  const cleanup = $effect.root(() => {
    state = createScopeMembership({
      scope: PermissionScope.PROJECT,
      scopeId: () => scopeId,
      canRead: () => true,
      onMembershipChanged,
    });
  });

  try {
    await body(state);
  } finally {
    cleanup();
  }
  return { onMembershipChanged };
};

const memberRole = (overrides: Partial<MemberRole> = {}): MemberRole => ({
  grantId: `${PermissionScope.PROJECT}:editor`,
  userId: 'user-1',
  roleId: 'editor',
  origin: MemberRoleOrigin.DIRECT,
  scope: PermissionScope.PROJECT,
  ...overrides,
});

describe('entries', () => {
  it('reads the roles on the object of the view', async () => {
    listAccess.mockResolvedValue([entry()]);

    await withMembership({}, async state => {
      await vi.waitFor(() => expect(state.entries).toHaveLength(1));
    });
    expect(listAccess).toHaveBeenCalledWith(project);
  });
});

describe('grantRoles', () => {
  it('gives each role on the object of the view', async () => {
    const { onMembershipChanged } = await withMembership({}, async state => {
      await expect(state.grantRoles('user-2', ['viewer', 'editor'])).resolves.toBe(true);
    });

    expect(grant).toHaveBeenCalledWith(project, 'viewer', 'user-2');
    expect(grant).toHaveBeenCalledWith(project, 'editor', 'user-2');
    expect(onMembershipChanged).toHaveBeenCalledOnce();
  });

  it('does nothing and answers false while the object id is still resolving', async () => {
    await withMembership({ scopeId: null }, async state => {
      await expect(state.grantRoles('user-2', ['viewer'])).resolves.toBe(false);
    });

    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses an empty role list rather than sending a call', async () => {
    await withMembership({}, async state => {
      await expect(state.grantRoles('user-2', [])).resolves.toBe(false);
    });

    expect(grant).not.toHaveBeenCalled();
  });

  it('answers false when a grant fails, so the caller can keep its form open', async () => {
    grant.mockRejectedValue(new Error('denied'));

    const { onMembershipChanged } = await withMembership({}, async state => {
      await expect(state.grantRoles('user-2', ['viewer'])).resolves.toBe(false);
    });

    expect(onMembershipChanged).not.toHaveBeenCalled();
  });
});

describe('addRole', () => {
  it('gives the one role and confirms it', async () => {
    await withMembership({}, state => state.addRole('user-2', 'viewer'));

    expect(grant).toHaveBeenCalledWith(project, 'viewer', 'user-2');
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it('stays silent when the grant failed: the global handler toasts it', async () => {
    grant.mockRejectedValue(new Error('denied'));

    await withMembership({}, state => state.addRole('user-2', 'viewer'));

    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('revokeRole', () => {
  it('takes back the role of the user and refreshes the member list', async () => {
    const { onMembershipChanged } = await withMembership({}, state =>
      state.revokeRole(memberRole()),
    );

    expect(revoke).toHaveBeenCalledWith(project, 'editor', 'user-1');
    expect(onMembershipChanged).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it('swallows a refused revoke: the last-owner guard lands here', async () => {
    revoke.mockRejectedValue(new Error('LAST_OWNER'));

    const { onMembershipChanged } = await withMembership({}, state =>
      state.revokeRole(memberRole()),
    );

    expect(onMembershipChanged).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('removeMember', () => {
  it('takes back each role of the user on the object, and keeps the owner', async () => {
    listAccess.mockResolvedValue([
      entry({ role: 'editor' }),
      entry({ role: 'viewer' }),
      entry({ role: 'owner' }),
      entry({ actorId: 'user-2', role: 'admin' }),
    ]);

    const { onMembershipChanged } = await withMembership({}, async state => {
      await vi.waitFor(() => expect(state.entries).toHaveLength(4));
      await state.removeMember('user-1', 'alice');
    });

    expect(revoke.mock.calls).toEqual([
      [project, 'editor', 'user-1'],
      [project, 'viewer', 'user-1'],
    ]);
    expect(onMembershipChanged).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledWith('alice removed: 2 grant(s) revoked');
  });

  it('does nothing while the object id is still resolving', async () => {
    await withMembership({ scopeId: null }, state => state.removeMember('user-1', 'alice'));

    expect(revoke).not.toHaveBeenCalled();
  });

  it('swallows a refused removal', async () => {
    listAccess.mockResolvedValue([entry()]);
    revoke.mockRejectedValue(new Error('denied'));

    const { onMembershipChanged } = await withMembership({}, async state => {
      await vi.waitFor(() => expect(state.entries).toHaveLength(1));
      await state.removeMember('user-1', 'alice');
      expect(state.isRemoving).toBe(false);
    });

    expect(onMembershipChanged).not.toHaveBeenCalled();
  });
});
