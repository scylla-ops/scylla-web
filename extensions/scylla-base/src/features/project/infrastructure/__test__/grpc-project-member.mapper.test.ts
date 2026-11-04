// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomainList } from '../grpc-project-member.mapper.ts';

const entry = (actorId: string, role: string, actorKind = 'user') => ({
  actorId: { value: actorId },
  actorKind,
  displayName: '',
  handle: actorId,
  role,
});

describe('grpcProjectMember.toDomainList', () => {
  it('lists each user once, with no display name when there is none, and no app', () => {
    expect(
      toDomainList([entry('ada', 'admin'), entry('ada', 'editor'), entry('ci', 'viewer', 'app')]),
    ).toEqual([{ id: 'ada', username: 'ada' }]);
  });
});
