import type { ObjectKind } from '../structs/object-ref.struct.ts';

/** The server sends no role of the instance in a read of the members. */
export type MemberScopeKind = Exclude<ObjectKind, 'platform'>;

/** One role of a member, with the scope where it is given. */
export interface MemberRoleEntity {
  scopeKind: MemberScopeKind;
  scopeId: string;
  scopeName: string;
  /** The name in `Grant` and `Revoke`, or `owner`. */
  role: string;
  /** The key in `RoleService`, or `owner`. */
  roleKey: string;
  roleName: string;
  /** Absent for a grant older than this field. */
  grantedAt?: Date;
  grantedBy?: string;
}

export interface MemberEntity {
  actorId: string;
  /** `user` for a person, `app` for a machine. */
  actorKind: string;
  displayName: string;
  handle: string;
  roles: MemberRoleEntity[];
}

/** The role that gives a permission. */
export interface AccessSourceEntity {
  scopeKind: MemberScopeKind;
  scopeId: string;
  scopeName: string;
  roleKey: string;
  roleName: string;
}

/** What one actor can do on one object. */
export interface MemberAccessEntity {
  member?: MemberEntity;
  /** A permission of the catalog that is not here, the actor does not have. */
  sources: ReadonlyMap<string, readonly AccessSourceEntity[]>;
}
