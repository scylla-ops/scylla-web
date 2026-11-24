/** A role for a new app: on the workspace (`projectId` null) or on one project. */
export interface RoleGrant {
  projectId: string | null;
  role: string;
}

/** The workspace role first, then one role for each project that has one. */
export const grantsOf = (
  workspaceRole: string,
  projectRoles: Readonly<Record<string, string>>,
): RoleGrant[] => [
  ...(workspaceRole ? [{ projectId: null, role: workspaceRole }] : []),
  ...Object.entries(projectRoles)
    .filter(([, role]) => !!role)
    .map(([projectId, role]) => ({ projectId, role })),
];
