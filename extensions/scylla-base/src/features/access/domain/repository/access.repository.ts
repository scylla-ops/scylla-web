import type { AccessEntryEntity } from '../entities/access-entry.entity.ts';
import type { MemberAccessEntity, MemberEntity } from '../entities/member.entity.ts';
import type { ObjectRef } from '../structs/object-ref.struct.ts';

export interface AccessRepository {
  /** Every role on the object. */
  listAccess(object: ObjectRef): Promise<AccessEntryEntity[]>;
  /** Each member of a workspace or of a project, with each role and its scope. */
  listMembers(object: ObjectRef): Promise<MemberEntity[]>;
  /** What one actor can do on a workspace or on a project, and which role gives it. */
  memberAccess(actorId: string, object: ObjectRef): Promise<MemberAccessEntity>;
  /** The permissions of the catalog that the caller holds on an object. */
  heldPermissions(object: ObjectRef): Promise<Set<string>>;
  grant(object: ObjectRef, role: string, actorId: string): Promise<void>;
  revoke(object: ObjectRef, role: string, actorId: string): Promise<void>;
  /** The names of `names` that the caller has on the object. */
  check(object: ObjectRef, names: string[]): Promise<Set<string>>;
}
