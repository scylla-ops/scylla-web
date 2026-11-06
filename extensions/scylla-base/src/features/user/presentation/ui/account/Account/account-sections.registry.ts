import { msg } from '@lingui/core/macro';
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
  /** Other words that find this page in the command bar. */
  keywords?: MessageDescriptor;
}

/** The links of the account section of the sidebar, in their order. */
export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { id: 'profile', title: userMessages.profile, icon: UserIcon },
  { id: 'appearance', title: userMessages.appearance, icon: SunIcon, keywords: msg`theme look colors` },
  { id: 'security', title: userMessages.security, icon: ShieldCheckIcon, keywords: msg`password 2fa` },
  { id: 'tokens', title: personalTokensMessages.navTitle, icon: KeyRoundIcon, keywords: msg`api key personal token` },
  {
    id: 'danger-zone',
    title: userMessages.dangerZone,
    icon: TriangleAlertIcon,
    danger: true,
    keywords: msg`delete account`,
  },
];

/** `undefined` for a segment that names no section. */
export const accountSection = (id: string | undefined): AccountSection | undefined =>
  ACCOUNT_SECTIONS.find(section => section.id === id);
