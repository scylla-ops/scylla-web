// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { AppAccess } from '@base/features/apps';
import {
  accessReachOf,
  coversEveryProject,
  keepsCover,
  orderGrants,
  projectGrantsIn,
  projectLabel,
  projectsWithoutGrant,
} from '../access.presenter.ts';

const grant = (
  scope: AppAccess['scope'],
  organizationId: string | null,
  overrides: Partial<AppAccess> = {},
): AppAccess => ({
  grantId: `${scope}-${organizationId}-${overrides.projectName ?? ''}`,
  scope,
  scopeId: '',
  organizationId,
  organizationName: organizationId === 'org-2' ? 'Globex' : 'Acme',
  projectName: '',
  roleId: 'role-1',
  roleName: 'Agent',
  ...overrides,
});

describe('orderGrants', () => {
  it('puts the grants of the current organization first, then system, then the others', () => {
    const other = grant('organization', 'org-2');
    const system = grant('system', null);
    const mine = grant('project', 'org-1', { projectName: 'prelude' });

    expect(orderGrants([other, system, mine], 'org-1')).toEqual([mine, system, other]);
  });
});

describe('projectLabel', () => {
  it('names the organization of a project that is not the current one', () => {
    expect(projectLabel(grant('project', 'org-1', { projectName: 'prelude' }), 'org-1')).toBe(
      'prelude',
    );
    expect(projectLabel(grant('project', 'org-2', { projectName: 'docs' }), 'org-1')).toBe(
      'Globex / docs',
    );
  });
});

describe('accessReachOf', () => {
  it('reads every project of this organization only for a grant on this organization', () => {
    expect(accessReachOf([grant('organization', 'org-1')], 'org-1')).toEqual({
      kind: 'organization',
    });
  });

  it('names the other organizations instead', () => {
    expect(accessReachOf([grant('organization', 'org-2')], 'org-1')).toEqual({
      kind: 'otherOrganizations',
      names: ['Globex'],
    });
  });

  it('lets a system grant win, and says nothing for no grant', () => {
    expect(accessReachOf([grant('project', 'org-1'), grant('system', null)], 'org-1')).toEqual({
      kind: 'system',
    });
    expect(accessReachOf([], 'org-1')).toEqual({ kind: 'none' });
  });

  it('names a single project, and counts several', () => {
    expect(accessReachOf([grant('project', 'org-1', { projectName: 'prelude' })], 'org-1')).toEqual(
      { kind: 'project', project: 'prelude' },
    );
    expect(
      accessReachOf(
        [
          grant('project', 'org-1', { projectName: 'prelude' }),
          grant('project', 'org-1', { projectName: 'docs' }),
        ],
        'org-1',
      ),
    ).toEqual({ kind: 'projects', count: 2 });
  });
});

describe('coversEveryProject', () => {
  it('holds for the organization grant of this organization and for a system grant only', () => {
    expect(coversEveryProject([grant('organization', 'org-1')], 'org-1')).toBe(true);
    expect(coversEveryProject([grant('system', null)], 'org-1')).toBe(true);
    expect(coversEveryProject([grant('organization', 'org-2')], 'org-1')).toBe(false);
    expect(
      coversEveryProject([grant('project', 'org-1', { projectName: 'prelude' })], 'org-1'),
    ).toBe(false);
  });
});

describe('projectGrantsIn', () => {
  it('keeps the project grants of this organization, which its organization grant replaces', () => {
    const mine = grant('project', 'org-1', { projectName: 'prelude' });
    const other = grant('project', 'org-2', { projectName: 'docs' });

    expect(projectGrantsIn([mine, other, grant('organization', 'org-1')], 'org-1')).toEqual([mine]);
  });
});

describe('projectsWithoutGrant', () => {
  it('leaves out the projects where the agent already has a grant', () => {
    const projects = [
      { id: 'p-1', name: 'prelude' },
      { id: 'p-2', name: 'docs' },
    ];
    const access = [grant('project', 'org-1', { scopeId: 'p-1', projectName: 'prelude' })];

    expect(projectsWithoutGrant(projects, access)).toEqual([{ id: 'p-2', name: 'docs' }]);
  });
});

describe('keepsCover', () => {
  const prelude = grant('project', 'org-1', { projectName: 'prelude' });
  const organization = grant('organization', 'org-1');

  it('keeps the cover of a project job while the organization grant stays', () => {
    expect(keepsCover([prelude, organization], prelude)).toBe(true);
    expect(keepsCover([prelude], prelude)).toBe(false);
  });

  it('keeps the cover of every job only through a system grant', () => {
    expect(keepsCover([organization, prelude], organization)).toBe(false);
    expect(keepsCover([organization, grant('system', null)], organization)).toBe(true);
  });

  it('does not count an organization grant of another organization', () => {
    expect(keepsCover([prelude, grant('organization', 'org-2')], prelude)).toBe(false);
  });
});
