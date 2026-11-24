import { describe, it, expect, vi, afterEach } from 'vitest';
import { Permission, PermissionScope } from '@platform/authz';
import { runQueryFn } from '@test/queries.ts';
import { withRegistry } from '@test/render.ts';
import { accessQueries } from '../access.queries.ts';
import { workspaceRef } from '@base/features/access/domain/structs/object-ref.struct.ts';

let restore: () => void = () => undefined;

afterEach(() => restore());

describe('accessQueries.myScope', () => {
  it('asks the server about this workspace, also when it is not the active one', async () => {
    const check = vi.fn((_object: unknown, names: string[]) =>
      Promise.resolve(new Set(names.filter(name => name === 'update_workspace'))),
    );
    restore = withRegistry({ access: { accessRepository: { check } } });

    const scope = await runQueryFn(accessQueries.myScope(workspaceRef('workspace-2')));

    expect(check.mock.calls[0][0]).toEqual({ kind: 'workspace', id: 'workspace-2' });
    expect(scope).toEqual({
      scope: PermissionScope.WORKSPACE,
      scopeId: 'workspace-2',
      access: { kind: 'restricted', permissions: [Permission.UPDATE_WORKSPACE] },
    });
  });

  it('keeps one cache entry for each object', () => {
    const [first, second] = ['workspace-1', 'workspace-2'].map(
      id => accessQueries.myScope(workspaceRef(id)).queryKey,
    );

    expect(first).not.toEqual(second);
  });
});
