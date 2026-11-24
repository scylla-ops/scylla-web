/** One role of one actor on an object. An actor with two roles has two entries. */
export interface AccessEntryEntity {
  actorId: string;
  /** `user` for a person, `app` for a machine. */
  actorKind: string;
  displayName: string;
  /** Empty for an actor with no handle. */
  handle: string;
  /** A fixed role, or the role `owner` of a workspace. */
  role: string;
}
