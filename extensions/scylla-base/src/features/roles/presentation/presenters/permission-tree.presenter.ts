import type { Permission, PermissionScope } from '@platform/authz';
import {
  getImplicitAtScope,
  getPermissionDefinitionsForScope,
  type PermissionDefinition,
} from '@base/features/roles/domain/structs/permission-catalog.struct.ts';
import type { CheckboxNode } from '@base/features/roles/presentation/presenters/checkbox-tree.presenter.ts';

/** Uses `dependsOn` as the parent; a parent outside `definitions` makes a root. */
export const buildPermissionTree = (
  definitions: PermissionDefinition[],
  label: (permission: Permission) => string,
): CheckboxNode[] => {
  const nodes = new Map<Permission, CheckboxNode>(
    definitions.map(definition => [definition.id, { id: definition.id, label: label(definition.id) }]),
  );

  const roots: CheckboxNode[] = [];

  for (const definition of definitions) {
    const node = nodes.get(definition.id)!;
    const parent = definition.dependsOn === undefined ? undefined : nodes.get(definition.dependsOn);

    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.children = [...(parent.children ?? []), node];
  }

  return roots;
};

/**
 * The entries the editor offers at `scope`: the implicit ones are not offered. A child of an
 * implicit entry hangs under its stand-in, or becomes a root.
 */
export const getEditablePermissionDefinitionsForScope = (
  scope: PermissionScope,
): PermissionDefinition[] => {
  const implicit = getImplicitAtScope(scope);
  const hidden = new Set(implicit.map(entry => entry.id));
  const standInFor = new Map(
    implicit
      .filter(entry => entry.standsIn !== undefined)
      .map(entry => [entry.id, entry.standsIn!] as const),
  );

  return getPermissionDefinitionsForScope(scope)
    .filter(definition => !hidden.has(definition.id))
    .map(definition => {
      if (definition.dependsOn === undefined) return definition;
      const substitute = standInFor.get(definition.dependsOn);
      return substitute === undefined ? definition : { ...definition, dependsOn: substitute };
    });
};
