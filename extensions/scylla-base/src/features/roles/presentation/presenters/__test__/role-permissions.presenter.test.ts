import { describe, expect, it } from 'vitest';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
import { permissionSummary } from '../role-permissions.presenter.ts';

const area = (id: string, actions: string[], implicit: string[] = []): CatalogArea => ({
  id,
  level: 'project',
  machine: false,
  permissions: actions.map(action => ({
    id: `${id}.${action}`,
    action,
    dependsOn: [],
    implicit: implicit.includes(action),
  })),
});

const areas = [
  area('project', ['view', 'edit', 'delete'], ['view']),
  area('pipelines', ['view', 'create', 'edit', 'run']),
  area('triggers', ['manage']),
  area('job_logs', ['view']),
];

const role = (over: Partial<RoleEntity>): RoleEntity => ({
  key: 'r-1',
  name: 'Role',
  description: '',
  level: 'project',
  holder: 'people',
  grantName: 'r-1',
  builtin: false,
  fullControl: false,
  permissions: [],
  holderCount: 0,
  ...over,
});

describe('permissionSummary', () => {
  it('says full control when the server says so, with what it adds at the level', () => {
    expect(permissionSummary(role({ fullControl: true, level: 'workspace' }), areas)).toEqual({
      kind: 'full',
      hint: 'also delete the workspace',
    });
  });

  it('says full control when the role holds every permission of its level', () => {
    const all = areas.flatMap(one => one.permissions.map(permission => permission.id));
    expect(permissionSummary(role({ permissions: all }), areas).kind).toBe('full');
  });

  it('says view only when the role only views, and names the resources', () => {
    const summary = permissionSummary(
      role({ permissions: ['project.view', 'job_logs.view', 'pipelines.view'] }),
      areas,
    );
    expect(summary).toEqual({ kind: 'viewOnly', areas: 'pipelines, job logs' });
  });

  it('gives one chip for each resource, the changes first, with no View beside a change', () => {
    const summary = permissionSummary(
      role({
        permissions: ['project.view', 'job_logs.view', 'pipelines.run', 'pipelines.view'],
      }),
      areas,
    );
    expect(summary).toEqual({
      kind: 'chips',
      chips: [
        { area: 'pipelines', title: 'Pipelines', actions: ['Run'] },
        { area: 'job_logs', title: 'Job logs', actions: ['View'] },
      ],
    });
  });

  it('puts the actions in the order of the catalog', () => {
    const summary = permissionSummary(
      role({ permissions: ['pipelines.run', 'pipelines.edit', 'pipelines.view'] }),
      areas,
    );
    expect(summary.kind === 'chips' && summary.chips[0]?.actions).toEqual(['Edit', 'Run']);
  });

  it('shows a permission that the catalog does not know with its id', () => {
    const summary = permissionSummary(role({ permissions: ['reports.export'] }), areas);
    expect(summary).toEqual({
      kind: 'chips',
      chips: [{ area: 'reports', title: 'reports', actions: ['export'] }],
    });
  });

  it('says nothing for a role with only what is always on', () => {
    expect(permissionSummary(role({ permissions: ['project.view'] }), areas)).toEqual({
      kind: 'none',
    });
  });
});
