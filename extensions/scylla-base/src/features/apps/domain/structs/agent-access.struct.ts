/** The projects whose jobs an agent takes, from its `runner` roles. */
export type AgentAccess = { kind: 'all' } | { kind: 'some'; projects: string[] } | { kind: 'none' };

interface Role {
  actorId: string;
  role: string;
}

interface ProjectRoles {
  name: string;
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
  const names = projects
    .filter(project => holdsRunner(project.entries, agentId))
    .map(project => project.name)
    .sort((a, b) => a.localeCompare(b));
  return names.length ? { kind: 'some', projects: names } : { kind: 'none' };
};
