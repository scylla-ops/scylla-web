// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcOrganizationMember from '../grpc-organization-member.mapper.ts';
import type { OrganizationMember } from '@base/generated/scylla/organization/v1/organization.ts';

describe('grpcOrganizationMember.toDomain', () => {
  it('unwraps the user id and carries the username through', () => {
    const member: OrganizationMember = { userId: { value: 'user-1' }, username: 'ravenne' };
    expect(grpcOrganizationMember.toDomain(member)).toEqual({
      userId: 'user-1',
      username: 'ravenne',
    });
  });

  it('defaults to an empty userId when the wrapper is absent', () => {
    const member: OrganizationMember = { userId: undefined, username: 'ravenne' };
    expect(grpcOrganizationMember.toDomain(member).userId).toBe('');
  });
});
