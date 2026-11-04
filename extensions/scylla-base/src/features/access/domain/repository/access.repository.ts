import type { AccessEntryEntity } from '../entities/access-entry.entity.ts';
import type { ObjectRef } from '../structs/object-ref.struct.ts';

export interface AccessRepository {
  /** Every role on the object. For a workspace, its owners too. */
  listAccess(object: ObjectRef): Promise<AccessEntryEntity[]>;
  grant(object: ObjectRef, role: string, actorId: string): Promise<void>;
  revoke(object: ObjectRef, role: string, actorId: string): Promise<void>;
  /** The names of `names` that the caller has on the object. */
  check(object: ObjectRef, names: string[]): Promise<Set<string>>;
}
