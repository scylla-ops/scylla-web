import type { AccessRepository } from '@base/features/access/domain/repository/access.repository.ts';
import type { AccessEntryEntity } from '@base/features/access/domain/entities/access-entry.entity.ts';
import type { ObjectRef } from '@base/features/access/domain/structs/object-ref.struct.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type {
  AccessEntry,
  ObjectRef as GrpcObjectRef,
} from '@base/generated/scylla/access/v1/access_service.ts';
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
