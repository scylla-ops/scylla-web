import type { CredentialRow } from './app-credentials.struct.ts';

/** A role of an app, with the name of what it holds it on. */
export interface HeldRole {
  role: string;
  on: string;
}

interface Role {
  actorId: string;
  role: string;
}

interface NamedRoles {
  name: string;
  entries: readonly Role[];
}

/** The roles of an app: on the workspace first, then on each project, by name. */
export const appRolesOf = (
  appId: string,
  workspace: NamedRoles,
  projects: readonly NamedRoles[],
): HeldRole[] => {
  const held = ({ name, entries }: NamedRoles) =>
    entries.filter(entry => entry.actorId === appId).map(({ role }) => ({ role, on: name }));
  const byName = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  return [...held(workspace), ...byName.flatMap(held)];
};

const isActive = (row: CredentialRow) => {
  if (row.kind === 'token') return row.state !== 'revoked';
  return row.kind === 'key' ? !row.key.revokedAt : true;
};

/** The lower, the sooner a line shows it: a token that needs attention comes first. */
const rankOf = (row: CredentialRow) => {
  if (row.kind === 'token') return { expired: 0, soon: 1, ok: 2, revoked: 2 }[row.state];
  return row.kind === 'ci' ? 3 : 4;
};

/** The credential that a line of the list shows, and the number of other active ones. */
export const mainCredential = (
  rows: readonly CredentialRow[],
): { row: CredentialRow; others: number } | null => {
  const active = rows.filter(isActive);
  const [row] = [...active].sort((a, b) => rankOf(a) - rankOf(b));
  return row ? { row, others: active.length - 1 } : null;
};
