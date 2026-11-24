import { i18n } from '@lingui/core';
import { roleName, type RoleEntity } from '@base/features/roles';
import {
  addsInProject,
  addsNothingInProject,
  inEveryProject,
} from '../messages/membership.messages.ts';

export interface SummaryInput {
  roles: readonly RoleEntity[];
  /** The names in `Grant`. */
  workspaceRoles: readonly string[];
  projectRows: readonly { role: string; projectName: string }[];
  workspaceName: string;
}

const byGrantName = (roles: readonly RoleEntity[], name: string) =>
  roles.find(role => role.grantName === name);

/** The text of "What they get": what each role adds on top of the roles of the workspace. */
export const summaryLines = ({
  roles,
  workspaceRoles,
  projectRows,
  workspaceName,
}: SummaryInput): string[] => {
  const fromWorkspace = workspaceRoles
    .map(name => byGrantName(roles, name))
    .filter((role): role is RoleEntity => role !== undefined);
  const covered = new Set(fromWorkspace.flatMap(role => role.permissions));

  const lines = fromWorkspace.map(role =>
    i18n._(inEveryProject(roleName(role), workspaceName, role.permissions.length)),
  );
  for (const row of projectRows) {
    const role = byGrantName(roles, row.role);
    if (!role || !row.projectName) continue;
    const added = role.permissions.filter(id => !covered.has(id)).length;
    lines.push(
      added > 0
        ? i18n._(addsInProject(roleName(role), added, row.projectName))
        : i18n._(addsNothingInProject(roleName(role), row.projectName)),
    );
  }
  return lines;
};
