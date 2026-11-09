import { describe, expect, it } from 'vitest';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
import { createRoleDraft } from './role-draft.state.svelte.ts';

const areas: CatalogArea[] = [
  {
    id: 'workspace',
    level: 'workspace',
    machine: false,
    permissions: [
      { id: 'workspace.view', action: 'view', dependsOn: [], implicit: true },
      { id: 'workspace.edit', action: 'edit', dependsOn: [], implicit: false },
    ],
  },
  {
    id: 'project',
    level: 'project',
    machine: false,
    permissions: [{ id: 'project.view', action: 'view', dependsOn: [], implicit: true }],
  },
  {
    id: 'pipelines',
    level: 'project',
    machine: false,
    permissions: [{ id: 'pipelines.run', action: 'run', dependsOn: [], implicit: false }],
  },
  {
    id: 'job_execution',
    level: 'workspace',
    machine: true,
    permissions: [{ id: 'job_execution.run', action: 'run', dependsOn: [], implicit: false }],
  },
];

const source = (overrides: Partial<RoleEntity>): RoleEntity => ({
  key: 'src',
  name: 'Source',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'src',
  builtin: true,
  fullControl: false,
  permissions: [],
  holderCount: 0,
  ...overrides,
});

const fresh = () => {
  const draft = createRoleDraft(undefined, () => areas);
  draft.fit();
  return draft;
};

describe('createRoleDraft: copy from a role', () => {
  it('takes the level, the holder and the permissions of the role, fitted to them', () => {
    const draft = fresh();

    draft.copy(
      source({
        level: 'project',
        holder: 'apps',
        permissions: ['pipelines.run', 'workspace.edit'],
      }),
    );

    expect(draft.level).toBe('project');
    expect(draft.holder).toBe('apps');
    expect([...draft.selected].sort()).toEqual(['pipelines.run', 'project.view']);
    expect(draft.source).toMatchObject({ key: 'src' });
  });

  it('clears every permission but the ones always on with the empty role, at the same level', () => {
    const draft = fresh();
    draft.change(new Set(['workspace.view', 'workspace.edit', 'pipelines.run']));

    draft.copy('empty');

    expect(draft.level).toBe('workspace');
    expect([...draft.selected]).toEqual(['workspace.view']);
    expect(draft.source).toBe('empty');
  });

  it('puts back the draft from before the copy on an undo, and forgets the copy', () => {
    const draft = fresh();
    draft.change(new Set(['workspace.view', 'workspace.edit']));

    draft.copy(source({ level: 'project', holder: 'apps', permissions: ['pipelines.run'] }));
    draft.undo();

    expect(draft.level).toBe('workspace');
    expect(draft.holder).toBe('people');
    expect([...draft.selected].sort()).toEqual(['workspace.edit', 'workspace.view']);
    expect(draft.source).toBeNull();
  });

  it('undoes only the last copy', () => {
    const draft = fresh();

    draft.copy(source({ key: 'a', permissions: ['workspace.edit'] }));
    draft.copy(source({ key: 'b', level: 'project', permissions: ['pipelines.run'] }));
    draft.undo();

    expect(draft.level).toBe('workspace');
    expect([...draft.selected].sort()).toEqual(['workspace.edit', 'workspace.view']);
  });
});

describe('createRoleDraft: level and holder', () => {
  it('keeps an instance role for people', () => {
    const draft = fresh();
    draft.chooseHolder('apps');

    draft.chooseLevel('platform');

    expect(draft.holder).toBe('people');
  });

  it('fits the permissions to a new holder', () => {
    const draft = fresh();
    draft.chooseHolder('apps');
    draft.change(new Set([...draft.selected, 'job_execution.run']));

    draft.chooseHolder('people');

    expect([...draft.selected]).toEqual(['workspace.view']);
  });
});
