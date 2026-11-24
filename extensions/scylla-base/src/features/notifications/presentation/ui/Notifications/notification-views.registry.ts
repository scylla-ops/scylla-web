import type { MessageDescriptor } from '@lingui/core';
import BellDotIcon from '@lucide/svelte/icons/bell-dot';
import CheckIcon from '@lucide/svelte/icons/check';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import InboxIcon from '@lucide/svelte/icons/inbox';
import MailIcon from '@lucide/svelte/icons/mail';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import UsersIcon from '@lucide/svelte/icons/users';
import { Permission } from '@platform/authz';
import { workspaceUrl } from '@platform/context';
import type { LucideIcon } from '@scylla/ui';
import type { NotificationFilter } from '../../../domain/entities/notification.entity.ts';
import { notificationMessages as messages } from '../../messages/notifications.messages.ts';

export type NotificationViewId =
  | 'inbox'
  | 'done'
  | 'failed-runs'
  | 'unread'
  | 'needs-action'
  | 'access'
  | 'security';

type ViewFilter = Partial<Omit<NotificationFilter, 'workspaceId'>>;

export interface NotificationView {
  /** The last segment of the URL: `notifications/<id>`. */
  id: NotificationViewId;
  title: MessageDescriptor;
  icon: LucideIcon;
  /** The title above this link, for the links up to the next one. */
  heading?: MessageDescriptor;
  /** What the view asks the server. A view with no filter is not a list of notifications. */
  filter?: ViewFilter;
  /** The link hides for a person with no access. */
  permission?: Permission;
}

/** The links of the notifications section of the sidebar, in their order. */
export const NOTIFICATION_VIEWS: readonly NotificationView[] = [
  { id: 'inbox', title: messages.inbox, icon: InboxIcon, filter: {} },
  { id: 'done', title: messages.done, icon: CheckIcon, filter: { done: true } },
  {
    id: 'failed-runs',
    title: messages.failedRuns,
    icon: CircleXIcon,
    permission: Permission.LIST_JOBS_BY_WORKSPACE,
  },
  {
    id: 'unread',
    title: messages.unread,
    icon: MailIcon,
    heading: messages.quickFilters,
    filter: { unreadOnly: true },
  },
  {
    id: 'needs-action',
    title: messages.needsAction,
    icon: BellDotIcon,
    filter: { needsActionOnly: true },
  },
  {
    id: 'access',
    title: messages.categoryAccess,
    icon: UsersIcon,
    heading: messages.category,
    filter: { category: 'access' },
  },
  {
    id: 'security',
    title: messages.categorySecurity,
    icon: ShieldCheckIcon,
    filter: { category: 'security' },
  },
];

/** `undefined` for a segment that names no view. */
export const notificationView = (id: string | undefined): NotificationView | undefined =>
  NOTIFICATION_VIEWS.find(view => view.id === id);

export const notificationViewHref = (
  slug: string | null | undefined,
  id: NotificationViewId,
): string => (slug ? workspaceUrl(slug, `notifications/${id}`) : `/notifications/${id}`);

export const notificationFilterOf = (
  filter: ViewFilter,
  workspaceId: string | null,
): NotificationFilter => ({
  done: false,
  unreadOnly: false,
  needsActionOnly: false,
  category: '',
  ...filter,
  workspaceId,
});

/** `true` if the filter can hide rows of the inbox, or of the done rows. */
export const filterHidesRows = ({
  unreadOnly,
  needsActionOnly,
  category,
  workspaceId,
}: NotificationFilter): boolean =>
  unreadOnly || needsActionOnly || category !== '' || workspaceId !== null;
