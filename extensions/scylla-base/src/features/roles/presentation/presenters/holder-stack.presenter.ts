import type { RoleHolderEntry, RoleHolders } from '../../domain/entities/role.entity.ts';

export interface HolderStack {
  /** One avatar for each actor, also when it holds the role on several projects. */
  shown: RoleHolderEntry[];
  /** The holders that have no avatar. */
  more: number;
}

/** The first actors of a role, for a stack of avatars in the list of the roles. */
export const holderStack = ({ holders, total }: RoleHolders, max = 3): HolderStack => {
  const actors = [...new Map(holders.map(holder => [holder.actorId, holder])).values()];
  const shown = actors.slice(0, max);
  return { shown, more: actors.length - shown.length + Math.max(0, total - holders.length) };
};
