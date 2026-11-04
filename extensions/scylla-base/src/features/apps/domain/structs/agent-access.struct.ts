export interface NamedProject {
  id: string;
  name: string;
}

/** The projects whose jobs an agent takes, from its `runner` roles. */
export type AgentAccess =
  | { kind: 'all' }
  | { kind: 'some'; projects: NamedProject[] }
  | { kind: 'none' };

interface Role {
  actorId: string;
  role: string;
}

interface ProjectRoles extends NamedProject {
  entries: readonly Role[];
}

const RUNNER = 'runner';

const holdsRunner = (entries: readonly Role[], agentId: string) =>
  entries.some(entry => entry.actorId === agentId && entry.role === RUNNER);

/** `runner` on the workspace gives each project; else the projects with `runner`, by name. */
export const agentAccessOf = (
  agentId: string,
  workspace: readonly Role[],
  projects: readonly ProjectRoles[],
): AgentAccess => {
  if (holdsRunner(workspace, agentId)) return { kind: 'all' };
  const held = projects
    .filter(project => holdsRunner(project.entries, agentId))
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return held.length ? { kind: 'some', projects: held } : { kind: 'none' };
};

/** The access that the user chose: each project, or the listed ones. */
export interface ChosenAccess {
  all: boolean;
  projectIds: readonly string[];
}

/** One role `runner` to give or to take back: on the workspace (`projectId` null) or a project. */
export interface RunnerChange {
  kind: 'grant' | 'revoke';
  projectId: string | null;
}

/** The grants come first: during the change the agent keeps the projects that it keeps after. */
export const runnerChanges = (current: AgentAccess, next: ChosenAccess): RunnerChange[] => {
  const held = current.kind === 'some' ? current.projects.map(project => project.id) : [];
  const grant = (projectId: string | null): RunnerChange => ({ kind: 'grant', projectId });
  const revoke = (projectId: string | null): RunnerChange => ({ kind: 'revoke', projectId });
  if (next.all) {
    return [...(current.kind === 'all' ? [] : [grant(null)]), ...held.map(revoke)];
  }
  return [
    ...next.projectIds.filter(id => !held.includes(id)).map(grant),
    ...held.filter(id => !next.projectIds.includes(id)).map(revoke),
    ...(current.kind === 'all' ? [revoke(null)] : []),
  ];
};
