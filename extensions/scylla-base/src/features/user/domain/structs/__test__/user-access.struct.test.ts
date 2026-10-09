// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { groupUserAccess, type UserAccess } from '../user-access.struct.ts';

const grant = (overrides: Partial<UserAccess>): UserAccess => ({
  grantId: 'grant',
  scope: 'organization',
  organizationId: 'org-1',
  organizationName: 'Acme',
  projectName: '',
  roleId: 'organization-member',
  roleName: 'Member',
  ...overrides,
});

describe('groupUserAccess', () => {
  it('puts the system grants in their own group', () => {
    const system = grant({
      grantId: 'g-system',
      scope: 'system',
      organizationId: undefined,
      organizationName: '',
      roleId: 'system-admin',
    });

    const grouped = groupUserAccess([system]);

    expect(grouped.system).toEqual([system]);
    expect(grouped.organizations).toEqual([]);
  });

  it('gathers the organization and project grants of one organization', () => {
    const member = grant({ grantId: 'g-1' });
    const projectRole = grant({
      grantId: 'g-2',
      scope: 'project',
      projectId: 'project-1',
      projectName: 'Web',
    });

    expect(groupUserAccess([member, projectRole]).organizations).toEqual([
      { organizationId: 'org-1', organizationName: 'Acme', grants: [member, projectRole] },
    ]);
  });

  it('keeps the order of the server between organizations', () => {
    const grouped = groupUserAccess([
      grant({ grantId: 'g-1', organizationId: 'org-1', organizationName: 'Acme' }),
      grant({ grantId: 'g-2', organizationId: 'org-2', organizationName: 'Beta' }),
      grant({ grantId: 'g-3', organizationId: 'org-1', organizationName: 'Acme' }),
    ]);

    expect(grouped.organizations.map(group => group.organizationName)).toEqual(['Acme', 'Beta']);
    expect(grouped.organizations[0].grants.map(entry => entry.grantId)).toEqual(['g-1', 'g-3']);
  });
});
