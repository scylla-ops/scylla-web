// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IInvitationServiceClient } from '@base/generated/scylla/workspaces/v1/invitation_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultInvitationRepository, toDomain } from '../default-invitation.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wire = (id: string) => ({
  id: { value: id },
  workspaceId: { value: 'ws-1' },
  email: `${id}@example.com`,
  role: 'member',
  invitedBy: { value: 'user-1' },
  expiresAt: TS,
  sentAt: TS,
});

const client = () =>
  ({
    createInvitation: vi.fn(() => unaryCall({ invitation: wire('inv-1') })),
    listInvitations: vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { invitations: [wire('a')], page: { nextToken: 'n' } }
          : { invitations: [wire('b')], page: { nextToken: '' } },
      ),
    ),
    revokeInvitation: vi.fn(() => unaryCall({})),
    resendInvitation: vi.fn(() => unaryCall({ invitation: wire('inv-1') })),
    acceptInvitation: vi.fn(() => unaryCall({ workspaceId: { value: 'ws-9' } })),
  }) as unknown as IInvitationServiceClient;

describe('toDomain', () => {
  it('unwraps the ids and formats the times', () => {
    expect(toDomain(wire('inv-1'))).toEqual({
      id: 'inv-1',
      workspaceId: 'ws-1',
      email: 'inv-1@example.com',
      role: 'member',
      invitedBy: 'user-1',
      expiresAt: ISO,
      sentAt: ISO,
    });
  });
});

describe('DefaultInvitationRepository', () => {
  it('creates an invitation with the email and the role', async () => {
    const invitations = client();

    await new DefaultInvitationRepository(invitations).create('ws-1', 'ada@example.com', 'admin');

    expect(invitations.createInvitation).toHaveBeenCalledWith({
      workspaceId: { value: 'ws-1' },
      email: 'ada@example.com',
      role: 'admin',
    });
  });

  it('reads every page of the open invitations', async () => {
    const list = await new DefaultInvitationRepository(client()).list('ws-1');

    expect(list.map(invitation => invitation.id)).toEqual(['a', 'b']);
  });

  it('gives the workspace that an accepted link joins', async () => {
    await expect(new DefaultInvitationRepository(client()).accept('tok')).resolves.toBe('ws-9');
  });
});
