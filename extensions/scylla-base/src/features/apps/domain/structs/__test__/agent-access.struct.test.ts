// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { agentAccessOf, runnerChanges, type AgentAccess } from '../agent-access.struct.ts';

const runner = (actorId: string) => ({ actorId, role: 'runner' });
const api = { id: 'p-api', name: 'api' };
const web = { id: 'p-web', name: 'web' };

describe('agent access', () => {
  it('gives each project to a runner of the workspace', () => {
    expect(agentAccessOf('a1', [runner('a1')], [])).toEqual({ kind: 'all' });
  });

  it('gives the projects of a runner of some projects, by name', () => {
    const projects = [
      { ...web, entries: [runner('a1')] },
      { ...api, entries: [runner('a1'), { actorId: 'a1', role: 'viewer' }] },
      { id: 'p-ml', name: 'ml', entries: [runner('a2')] },
    ];
    expect(agentAccessOf('a1', [], projects)).toEqual({ kind: 'some', projects: [api, web] });
    expect(agentAccessOf('a3', [{ actorId: 'a3', role: 'viewer' }], projects)).toEqual({
      kind: 'none',
    });
  });
});

describe('runner changes', () => {
  const some: AgentAccess = { kind: 'some', projects: [api, web] };

  it('changes nothing when the access stays', () => {
    expect(runnerChanges({ kind: 'all' }, { all: true, projectIds: [] })).toEqual([]);
    expect(runnerChanges(some, { all: false, projectIds: ['p-web', 'p-api'] })).toEqual([]);
  });

  it('gives the workspace before it takes back the projects', () => {
    expect(runnerChanges(some, { all: true, projectIds: [] })).toEqual([
      { kind: 'grant', projectId: null },
      { kind: 'revoke', projectId: 'p-api' },
      { kind: 'revoke', projectId: 'p-web' },
    ]);
  });

  it('gives the projects before it takes back the workspace', () => {
    expect(runnerChanges({ kind: 'all' }, { all: false, projectIds: ['p-api'] })).toEqual([
      { kind: 'grant', projectId: 'p-api' },
      { kind: 'revoke', projectId: null },
    ]);
  });

  it('adds and removes projects', () => {
    expect(runnerChanges(some, { all: false, projectIds: ['p-api', 'p-ml'] })).toEqual([
      { kind: 'grant', projectId: 'p-ml' },
      { kind: 'revoke', projectId: 'p-web' },
    ]);
    expect(runnerChanges({ kind: 'none' }, { all: true, projectIds: [] })).toEqual([
      { kind: 'grant', projectId: null },
    ]);
  });
});
