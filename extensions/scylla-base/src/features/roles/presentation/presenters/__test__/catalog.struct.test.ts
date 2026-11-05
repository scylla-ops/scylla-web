// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  fitToRole,
  permissionsFor,
  togglePermission,
  type CatalogArea,
} from '../../../domain/structs/catalog.struct.ts';
import { missingPermissionIds } from '../../../domain/structs/catalog.struct.ts';

const areas: CatalogArea[] = [
  {
    id: 'users',
    level: 'platform',
    machine: false,
    permissions: [{ id: 'users.view', action: 'view', dependsOn: [], implicit: false }],
  },
  {
    id: 'workspace',
    level: 'workspace',
    machine: false,
    permissions: [{ id: 'workspace.view', action: 'view', dependsOn: [], implicit: true }],
  },
  {
    id: 'job_execution',
    level: 'workspace',
    machine: true,
    permissions: [{ id: 'job_execution.run', action: 'run', dependsOn: [], implicit: false }],
  },
  {
    id: 'pipelines',
    level: 'project',
    machine: false,
    permissions: [
      { id: 'pipelines.view', action: 'view', dependsOn: [], implicit: false },
      { id: 'pipelines.edit', action: 'edit', dependsOn: ['pipelines.view'], implicit: false },
    ],
  },
];

describe('the catalog', () => {
  it('counts what a role can hold', () => {
    expect(permissionsFor(areas, 'project', 'people')).toHaveLength(2);
    expect(permissionsFor(areas, 'workspace', 'people')).toHaveLength(3);
    expect(permissionsFor(areas, 'workspace', 'apps')).toHaveLength(4);
    expect(permissionsFor(areas, 'platform', 'people')).toHaveLength(4);
  });

  it('checks what a permission depends on', () => {
    const selected = togglePermission(new Set(), 'pipelines.edit', areas);
    expect([...selected].sort()).toEqual(['pipelines.edit', 'pipelines.view']);
  });

  it('unchecks what needs a permission', () => {
    const selected = new Set(['pipelines.view', 'pipelines.edit']);
    expect(togglePermission(selected, 'pipelines.view', areas).size).toBe(0);
  });

  it('keeps what the level can hold, and adds the implicit permissions of the level', () => {
    const selected = new Set(['users.view', 'pipelines.view', 'job_execution.run']);
    expect([...fitToRole(selected, areas, 'workspace', 'people')]).toEqual([
      'workspace.view',
      'pipelines.view',
    ]);
    expect([...fitToRole(selected, areas, 'platform', 'people')]).toEqual([
      'users.view',
      'pipelines.view',
    ]);
  });
});

describe('missingPermissionIds', () => {
  const areas = [
    {
      id: 'workspace',
      level: 'workspace' as const,
      machine: false,
      permissions: [{ id: 'workspace.view', action: 'view', dependsOn: [], implicit: true }],
    },
  ];

  it('does not count a permission of a machine', () => {
    const machines = [
      {
        id: 'job_execution',
        level: 'workspace' as const,
        machine: true,
        permissions: [{ id: 'job_execution.run', action: 'run', dependsOn: [], implicit: false }],
      },
    ];

    expect(missingPermissionIds({ permissions: ['job_execution.run'] }, new Set(), machines)).toEqual(
      [],
    );
  });

  it('names what the caller does not hold, with no implicit permission', () => {
    const role = { permissions: ['workspace.view', 'members.manage', 'pipelines.run'] };

    expect(missingPermissionIds(role, new Set(['pipelines.run']), areas)).toEqual(['members.manage']);
  });
});
