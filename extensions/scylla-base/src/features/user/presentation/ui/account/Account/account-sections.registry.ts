import type { MessageDescriptor } from '@lingui/core';
import Building2Icon from '@lucide/svelte/icons/building-2';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import SunIcon from '@lucide/svelte/icons/sun';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import UserIcon from '@lucide/svelte/icons/user';
import type { LucideIcon } from '@scylla/ui';
import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

export type AccountSectionId =
  | 'profile'
  | 'appearance'
  | 'security'
  | 'organizations'
  | 'danger-zone';

export interface AccountSection {
  /** The last segment of the URL: `account/<id>`. */
  id: AccountSectionId;
  title: MessageDescriptor;
  icon: LucideIcon;
  danger?: boolean;
}

/** The entries of the settings nav of the account page, in their order. */
export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { id: 'profile', title: userMessages.profile, icon: UserIcon },
  { id: 'appearance', title: userMessages.appearance, icon: SunIcon },
  { id: 'security', title: userMessages.security, icon: ShieldCheckIcon },
  { id: 'organizations', title: userMessages.organizations, icon: Building2Icon },
  { id: 'danger-zone', title: userMessages.dangerZone, icon: TriangleAlertIcon, danger: true },
];

/** `undefined` for a segment that names no section. */
export const accountSection = (id: string | undefined): AccountSection | undefined =>
  ACCOUNT_SECTIONS.find(section => section.id === id);
