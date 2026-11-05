import type { MessageDescriptor } from '@lingui/core';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import SunIcon from '@lucide/svelte/icons/sun';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import UserIcon from '@lucide/svelte/icons/user';
import type { LucideIcon } from '@scylla/ui';
import { personalTokensMessages } from '@base/features/user/presentation/messages/personal-tokens.messages.ts';
import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

export type AccountSectionId = 'profile' | 'appearance' | 'security' | 'tokens' | 'danger-zone';

export interface AccountSection {
  /** The last segment of the URL: `account/<id>`. */
  id: AccountSectionId;
  title: MessageDescriptor;
  icon: LucideIcon;
  danger?: boolean;
}

/** The links of the account section of the sidebar, in their order. */
export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { id: 'profile', title: userMessages.profile, icon: UserIcon },
  { id: 'appearance', title: userMessages.appearance, icon: SunIcon },
  { id: 'security', title: userMessages.security, icon: ShieldCheckIcon },
  { id: 'tokens', title: personalTokensMessages.navTitle, icon: KeyRoundIcon },
  { id: 'danger-zone', title: userMessages.dangerZone, icon: TriangleAlertIcon, danger: true },
];

/** `undefined` for a segment that names no section. */
export const accountSection = (id: string | undefined): AccountSection | undefined =>
  ACCOUNT_SECTIONS.find(section => section.id === id);
