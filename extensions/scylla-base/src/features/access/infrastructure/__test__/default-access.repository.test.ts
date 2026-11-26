// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { Member } from '@base/generated/scylla/access/v1/access_service.ts';
import { unaryCall } from '@test/grpc.ts';
import { workspaceRef } from '@base/features/access/domain/structs/object-ref.struct.ts';
import { DefaultAccessRepository } from '../default-access.repository.ts';

const member = (overrides: Partial<Member>): Member => ({
  actorId: { value: 'a-1' },
  actorKind: 'user',
  displayName: 'Bruno Martin',
  handle: 'bruno',
  roles: [],
  runner: false,
  ...overrides,
});

const repositoryOf = (members: Member[]) =>
  new DefaultAccessRepository({
    listMembers: vi.fn(() => unaryCall({ members })),
  } as unknown as IAccessServiceClient);

describe('DefaultAccessRepository.listMembers', () => {
  it('gives the photo or the color of a person, and the icon of an app', async () => {
    const members = await repositoryOf([
      member({ avatar: { imageId: { value: 'img-1' }, color: '' } }),
      member({ avatar: { color: 'chart-4' } }),
      member({
        actorKind: 'app',
        runner: true,
        icon: { kind: { oneofKind: 'glyph', glyph: { name: 'server', color: 'chart-3' } } },
      }),
      member({
        actorKind: 'app',
        icon: { kind: { oneofKind: 'imageId', imageId: { value: 'img-2' } } },
      }),
      member({}),
    ]).listMembers(workspaceRef('w-1'));

    const looks = members.map(({ avatarUrl, avatarColor, avatarGlyph }) => ({
      avatarUrl,
      avatarColor,
      avatarGlyph,
    }));
    expect(looks).toEqual([
      { avatarUrl: '/images/img-1', avatarColor: undefined, avatarGlyph: undefined },
      { avatarUrl: undefined, avatarColor: 'chart-4', avatarGlyph: undefined },
      { avatarUrl: undefined, avatarColor: 'chart-3', avatarGlyph: 'server' },
      { avatarUrl: '/images/img-2', avatarColor: undefined, avatarGlyph: undefined },
      { avatarUrl: undefined, avatarColor: undefined, avatarGlyph: undefined },
    ]);
  });
});
