import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';
import {
  identityKindOf,
  type IdentityKind,
  type UserIdentityProfile,
} from '@shared/presentation/presenters/user-identity.presenter.ts';
import type { NotificationEntity } from '../../domain/entities/notification.entity.ts';

/** What the start of a row shows: who acted, and in which workspace. */
export interface RowMark {
  /** The actor, as `IdentityAvatar` shows it. Unset: no actor, the glyph of the kind shows. */
  actor?: { profile: UserIdentityProfile; kind: IdentityKind };
  /** The workspace of the row. Unset: the row is in no workspace. */
  workspace?: { name: string; icon: CustomIcon | undefined };
}

/**
 * The mark of a row. A row about the reader that is not an invitation has no icon from the server:
 * the icon of a workspace of the reader (`workspaces`) takes its place.
 */
export const rowMark = (
  row: NotificationEntity,
  workspaces: readonly { id: string; icon?: CustomIcon }[],
): RowMark => {
  const actor =
    row.actorKind && row.actorName
      ? {
          profile: { displayName: row.actorName, username: '', ...row.actorLook },
          kind: identityKindOf({ actorKind: row.actorKind, runner: false }),
        }
      : undefined;
  const workspace = row.workspaceId
    ? {
        name: row.workspaceName,
        icon: row.workspaceIcon ?? workspaces.find(item => item.id === row.workspaceId)?.icon,
      }
    : undefined;
  return { ...(actor && { actor }), ...(workspace && { workspace }) };
};
