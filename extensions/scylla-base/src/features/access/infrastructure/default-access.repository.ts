import type { AccessRepository } from '@base/features/access/domain/repository/access.repository.ts';
import type { AccessEntryEntity } from '@base/features/access/domain/entities/access-entry.entity.ts';
import type {
  AccessSourceEntity,
  MemberAccessEntity,
  MemberEntity,
  MemberScopeKind,
} from '@base/features/access/domain/entities/member.entity.ts';
import type { ObjectRef } from '@base/features/access/domain/structs/object-ref.struct.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type {
  AccessEntry,
  AccessSource,
  Member,
  ObjectRef as GrpcObjectRef,
} from '@base/generated/scylla/access/v1/access_service.ts';
import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';
import { idValue, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

const PAGE_SIZE = 100;
/** The server answers at most 50 names in one call. */
const MAX_CHECKS = 50;

const toGrpc = ({ kind, id }: ObjectRef): GrpcObjectRef => ({ kind, id: wrapId(id) });

const toDomain = (entry: AccessEntry): AccessEntryEntity => ({
  actorId: idValue(entry.actorId),
  actorKind: entry.actorKind,
  displayName: entry.displayName,
  handle: entry.handle,
  role: entry.role,
});

const memberToDomain = (member: Member): MemberEntity => ({
  actorId: idValue(member.actorId),
  actorKind: member.actorKind,
  displayName: member.displayName,
  handle: member.handle,
  roles: member.roles.map(role => ({
    scopeKind: role.scopeKind as MemberScopeKind,
    scopeId: idValue(role.scopeId),
    scopeName: role.scopeName,
    role: role.role,
    roleKey: role.roleKey,
    roleName: role.roleName,
    ...(role.grantedAt ? { grantedAt: Timestamp.toDate(role.grantedAt) } : {}),
    ...(role.grantedBy ? { grantedBy: idValue(role.grantedBy) } : {}),
  })),
});

const sourceToDomain = (source: AccessSource): AccessSourceEntity => ({
  scopeKind: source.scopeKind as MemberScopeKind,
  scopeId: idValue(source.scopeId),
  scopeName: source.scopeName,
  roleKey: source.roleKey,
  roleName: source.roleName,
});

export class DefaultAccessRepository implements AccessRepository {
  constructor(private readonly client: IAccessServiceClient) {}

  public async listAccess(object: ObjectRef): Promise<AccessEntryEntity[]> {
    const entries: AccessEntry[] = [];
    let token = '';
    do {
      const response = await this.client.listAccess({
        object: toGrpc(object),
        page: { size: PAGE_SIZE, token },
      }).response;
      entries.push(...response.entries);
      token = response.page?.nextToken ?? '';
    } while (token);
    return entries.map(toDomain);
  }

  public async listMembers(object: ObjectRef): Promise<MemberEntity[]> {
    const { members } = await this.client.listMembers({ object: toGrpc(object) }).response;
    return members.map(memberToDomain);
  }

  public async memberAccess(actorId: string, object: ObjectRef): Promise<MemberAccessEntity> {
    const { member, permissions } = await this.client.getMemberAccess({
      actorId: wrapId(actorId),
      object: toGrpc(object),
    }).response;
    return {
      ...(member ? { member: memberToDomain(member) } : {}),
      sources: new Map(
        permissions.map(one => [one.permission, one.sources.map(sourceToDomain)]),
      ),
    };
  }

  public async heldPermissions(object: ObjectRef): Promise<Set<string>> {
    const { permissions } = await this.client.listHeldPermissions({ object: toGrpc(object) })
      .response;
    return new Set(permissions);
  }

  public async grant(object: ObjectRef, role: string, actorId: string): Promise<void> {
    await this.client.grant({ object: toGrpc(object), role, actorId: wrapId(actorId) }).response;
  }

  public async revoke(object: ObjectRef, role: string, actorId: string): Promise<void> {
    await this.client.revoke({ object: toGrpc(object), role, actorId: wrapId(actorId) }).response;
  }

  public async check(object: ObjectRef, names: string[]): Promise<Set<string>> {
    const allowed = new Set<string>();
    for (let start = 0; start < names.length; start += MAX_CHECKS) {
      const { answers } = await this.client.checkPermissions({
        object: toGrpc(object),
        permissions: names.slice(start, start + MAX_CHECKS),
      }).response;
      for (const answer of answers) if (answer.allowed) allowed.add(answer.permission);
    }
    return allowed;
  }
}
