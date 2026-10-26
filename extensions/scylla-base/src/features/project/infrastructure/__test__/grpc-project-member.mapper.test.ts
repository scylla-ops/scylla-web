// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcProjectMember from '../grpc-project-member.mapper.ts';
import type { ProjectMember } from '@base/generated/scylla/project/v1/project.ts';

describe('grpcProjectMember.toDomain', () => {
  it('unwraps the user id and carries the username through', () => {
    const member: ProjectMember = { userId: { value: 'user-1' }, username: 'ravenne' };
    expect(grpcProjectMember.toDomain(member)).toEqual({
      userId: 'user-1',
      username: 'ravenne',
    });
  });

  it('defaults to an empty userId when the wrapper is absent', () => {
    const member: ProjectMember = { userId: undefined, username: 'ravenne' };
    expect(grpcProjectMember.toDomain(member).userId).toBe('');
  });
});
