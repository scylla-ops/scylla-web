export type RoleNameIssue = 'empty';

export const roleNameIssue = (name: string): RoleNameIssue | null =>
  name.trim() === '' ? 'empty' : null;
