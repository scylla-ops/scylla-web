import type { MessageDescriptor } from '@lingui/core';
import { point } from '@scylla/core-sdk';
import type { LucideIcon } from '@scylla/ui';
import type { NotificationEntity } from '../domain/entities/notification.entity.ts';

/** How the inbox shows one kind. An edition that adds a kind adds its view. */
export interface KindView {
  /** The key of the kind, as the server writes it. */
  kind: string;
  icon: LucideIcon;
  /** The sentence of the row. */
  text: (row: NotificationEntity) => MessageDescriptor;
  /** A second sentence, if the row has more to say. */
  detail?: (row: NotificationEntity) => string | null;
  /** The page of the row. `slug` is the active workspace, or `null` outside a workspace. */
  href?: (row: NotificationEntity, slug: string | null) => string | null;
}

/** Listed in `NotificationsModule.points`: the loader names them `notifications.<key>`. */
export const notificationsPoints = {
  /** The views of the kinds. A row of another kind shows a generic line. */
  kinds: point.value<readonly KindView[]>(),
};
