// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomain, uniqueUsers } from '../grpc-organization-member.mapper.ts';

const entry = (actorId: string, role: string, actorKind = 'user') => ({
  actorId: { value: actorId },
  actorKind,
  displayName: `Name ${actorId}`,
  handle: actorId,
  role,
});

describe('grpcOrganizationMember', () => {
  it('maps an entry to a person', () => {
    expect(toDomain(entry('ada', 'admin'))).toEqual({
      id: 'ada',
      username: 'ada',
      displayName: 'Name ada',
    });
  });

  it('lists each user once, and no app', () => {
    const users = uniqueUsers([
      entry('ada', 'owner'),
      entry('ada', 'admin'),
      entry('bob', 'viewer'),
      entry('ci', 'runner', 'app'),
    ]);

    expect(users.map(user => user.id)).toEqual(['ada', 'bob']);
  });
});
