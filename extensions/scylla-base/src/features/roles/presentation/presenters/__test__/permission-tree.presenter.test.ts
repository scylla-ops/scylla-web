// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Permission, PermissionScope } from '@platform/authz';
import {
  buildPermissionTree,
  getEditablePermissionDefinitionsForScope,
} from '@base/features/roles/presentation/presenters/permission-tree.presenter.ts';
import {
  getPermissionDefinitionsForScope,
  isImplicitAtScope,
  type PermissionDefinition,
} from '@base/features/roles/domain/structs/permission-catalog.struct.ts';

const def = (overrides: Partial<PermissionDefinition> & { id: Permission }): PermissionDefinition => ({
  scope: PermissionScope.PROJECT,
  ...overrides,
});

// The enum member name: a readable, unique label.
const label = (permission: Permission): string => Permission[permission];
const named = (permission: Permission) => Permission[permission];

describe('buildPermissionTree', () => {
  it('a definition with no dependsOn is a root', () => {
    const tree = buildPermissionTree([def({ id: Permission.READ_PROJECT })], label);
    expect(tree).toEqual([{ id: Permission.READ_PROJECT, label: named(Permission.READ_PROJECT) }]);
  });

  it('nests a definition under its dependsOn parent, when the parent is present in the list', () => {
    const tree = buildPermissionTree(
      [
        def({ id: Permission.READ_PROJECT }),
        def({ id: Permission.UPDATE_PROJECT, dependsOn: Permission.READ_PROJECT }),
      ],
      label,
    );

    expect(tree).toEqual([
      {
        id: Permission.READ_PROJECT,
        label: named(Permission.READ_PROJECT),
        children: [{ id: Permission.UPDATE_PROJECT, label: named(Permission.UPDATE_PROJECT) }],
      },
    ]);
  });

  it('a dependsOn whose target is absent from the list becomes a root instead (the usual case for a single-scope filter)', () => {
    const tree = buildPermissionTree(
      [def({ id: Permission.UPDATE_PROJECT, dependsOn: Permission.READ_PROJECT })],
      label,
    );

    expect(tree).toEqual([{ id: Permission.UPDATE_PROJECT, label: named(Permission.UPDATE_PROJECT) }]);
  });

  it('preserves catalog order among roots', () => {
    const tree = buildPermissionTree(
      [def({ id: Permission.DELETE_PROJECT }), def({ id: Permission.READ_PROJECT })],
      label,
    );
    expect(tree.map(n => n.id)).toEqual([Permission.DELETE_PROJECT, Permission.READ_PROJECT]);
  });

  it('preserves catalog order among siblings sharing the same parent', () => {
    const tree = buildPermissionTree(
      [
        def({ id: Permission.READ_PROJECT }),
        def({ id: Permission.DELETE_PROJECT, dependsOn: Permission.READ_PROJECT }),
        def({ id: Permission.UPDATE_PROJECT, dependsOn: Permission.READ_PROJECT }),
      ],
      label,
    );

    expect(tree[0].children?.map(child => child.id)).toEqual([
      Permission.DELETE_PROJECT,
      Permission.UPDATE_PROJECT,
    ]);
  });

  it('an empty catalog produces an empty tree', () => {
    expect(buildPermissionTree([], label)).toEqual([]);
  });

  it('resolves each node\'s label through the given labeler', () => {
    const tree = buildPermissionTree([def({ id: Permission.READ_PROJECT })], () => 'Custom label');
    expect(tree[0].label).toBe('Custom label');
  });
});

describe('getEditablePermissionDefinitionsForScope — what the editor actually renders', () => {
  it('never renders a hidden (implicit) permission as a toggle', () => {
    const ids = getEditablePermissionDefinitionsForScope(PermissionScope.ORGANIZATION).map(d => d.id);
    expect(ids).not.toContain(Permission.READ_ORGANIZATION);
    expect(ids).not.toContain(Permission.READ_PROJECT);
    expect(ids).not.toContain(Permission.READ_PIPELINE);
  });

  it('re-parents a child of a hidden node onto its stand-in, so the tree does not point at a node that is not rendered', () => {
    const definitions = getEditablePermissionDefinitionsForScope(PermissionScope.ORGANIZATION);
    const updateProject = definitions.find(d => d.id === Permission.UPDATE_PROJECT);
    // At ORGANIZATION scope, READ_PROJECT is hidden and LIST_PROJECTS_BY_ORGANIZATION stands in for it.
    expect(updateProject?.dependsOn).toBe(Permission.LIST_PROJECTS_BY_ORGANIZATION);
  });

  it('leaves dependsOn untouched when the parent is not hidden at this scope', () => {
    const definitions = getEditablePermissionDefinitionsForScope(PermissionScope.PROJECT);
    const updateProject = definitions.find(d => d.id === Permission.UPDATE_PROJECT);
    expect(updateProject?.dependsOn).toBe(Permission.READ_PROJECT);
  });

  it('is exactly getPermissionDefinitionsForScope minus the hidden entries, same order', () => {
    const all = getPermissionDefinitionsForScope(PermissionScope.PROJECT).map(d => d.id);
    const editable = getEditablePermissionDefinitionsForScope(PermissionScope.PROJECT).map(d => d.id);
    const hiddenIds = all.filter(id => isImplicitAtScope(id, PermissionScope.PROJECT));
    expect(editable).toEqual(all.filter(id => !hiddenIds.includes(id)));
  });
});
