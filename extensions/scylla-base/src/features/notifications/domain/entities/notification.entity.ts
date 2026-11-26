import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';

/** How the actor of a row shows: the photo or the color of a person, the icon of an app. */
export interface NotificationActorLook {
  /** The URL of the photo of a person, or of the image of the icon of an app. */
  avatarUrl?: string;
  /** The color of the initials of a person, or of the glyph of an app. */
  avatarColor?: string;
  /** The glyph of the icon of an app, a name of `ENTITY_GLYPHS`. */
  avatarGlyph?: string;
}

/** The state of the invitation of a row, as it is now. */
export type NotificationInvitationState =
  | { kind: 'open'; expiresAt: string }
  | { kind: 'accepted'; acceptedAt: string }
  | { kind: 'expired'; expiredAt: string };

/** The invitation of a row. */
export interface NotificationInvitation {
  id: string;
  /** The key of the role that the invitation gives. */
  role: string;
  state: NotificationInvitationState;
}

/**
 * One notification of the signed-in user. It holds a kind and its parameters, never a sentence:
 * `kind-views.ts` makes the text in the language of the reader.
 */
export interface NotificationEntity {
  id: string;
  /** `<subject>.<action>`. The list is open: an edition adds kinds. */
  kind: string;
  category: string;
  /** Why the reader gets the row: `subject` means that the row is about the reader. */
  reason: string;
  /** Empty if there is no actor, or if the user no longer exists. */
  actorName: string;
  /** `user` for a person, `app` for a machine. Empty with no actor. */
  actorKind: string;
  actorLook: NotificationActorLook;
  workspaceId: string | null;
  workspaceSlug: string;
  workspaceName: string;
  /**
   * Unset: the default icon, or no workspace. The server gives no icon on a row about the reader
   * that is not an invitation: the reader can have no access to the workspace now.
   */
  workspaceIcon?: CustomIcon;
  projectId: string | null;
  projectName: string;
  params: Readonly<Record<string, string>>;
  occurrences: number;
  needsAction: boolean;
  firstAt: string;
  lastAt: string;
  read: boolean;
  done: boolean;
  invitation: NotificationInvitation | null;
}

/** The counts for the badge. */
export interface NotificationSummary {
  /** The count stops at 100. */
  unread: number;
  needsAction: number;
  /** The time to wait before the next read of the counts. */
  pollAfterSeconds: number;
}

/** The filters of a list. */
export interface NotificationFilter {
  done: boolean;
  unreadOnly: boolean;
  needsActionOnly: boolean;
  workspaceId: string | null;
  category: string;
}

/** One page of a list. */
export interface NotificationPage {
  items: NotificationEntity[];
  /** Empty on the last page. */
  nextToken: string;
}
