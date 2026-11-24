// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { RoleEntity } from '@base/features/roles';
import { summaryLines } from '../add-members.presenter.ts';

const role = (grantName: string, name: string, permissions: string[]): RoleEntity => ({
  key: grantName,
  name,
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName,
  builtin: false,
  fullControl: false,
  permissions,
  holderCount: 0,
});

const roles = [
  role('viewer', 'Viewer', ['a', 'b']),
  role('editor', 'Editor', ['a', 'b', 'c', 'd']),
  role('small', 'Small', ['a']),
];

describe('summaryLines', () => {
  it('tells the permissions of a workspace role in every project', () => {
    expect(
      summaryLines({
        roles,
        workspaceRoles: ['viewer'],
        projectRows: [],
        workspaceName: 'acme',
      }),
    ).toEqual(['Viewer in acme: 2 permissions in every project.']);
  });

  it('counts only what a project role adds', () => {
    const lines = summaryLines({
      roles,
      workspaceRoles: ['viewer'],
      projectRows: [
        { role: 'editor', projectName: 'api' },
        { role: 'small', projectName: 'web' },
      ],
      workspaceName: 'acme',
    });

    expect(lines[1]).toBe('Editor adds 2 in api.');
    expect(lines[2]).toBe('Small adds nothing in web, because the workspace role covers it.');
  });

  it('leaves out a row with no role or no project', () => {
    const lines = summaryLines({
      roles,
      workspaceRoles: [],
      projectRows: [
        { role: '', projectName: 'api' },
        { role: 'editor', projectName: '' },
      ],
      workspaceName: 'acme',
    });

    expect(lines).toEqual([]);
  });
});
