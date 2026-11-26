import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import MoonIcon from '@lucide/svelte/icons/moon';
import SmileIcon from '@lucide/svelte/icons/smile';
import SunIcon from '@lucide/svelte/icons/sun';
import type { LucideIcon } from '@scylla/ui';
import type { ActionCommand, ChoiceCommand } from '@scylla/core-sdk';
import {
  currentThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@scylla/ui/stores';
import { avatarMessages } from './messages/avatar.messages.ts';
import { openGlyphAvatar } from './ui/components/UserAvatarCard/photo-focus.state.svelte.ts';

const TYPE = msg`Theme`;

const theme = (
  value: ThemePreference,
  title: MessageDescriptor,
  keywords: MessageDescriptor,
  icon: LucideIcon,
): ChoiceCommand => ({
  id: `user.theme-${value}`,
  kind: 'choice',
  type: TYPE,
  title,
  keywords,
  icon,
  current: () => currentThemePreference() === value,
  select: () => setThemePreference(value),
});

/** The same entry as the account menu: it opens the editor of the glyph avatar. */
const glyphAvatar: ActionCommand = {
  id: 'user.glyph-avatar',
  kind: 'action',
  title: avatarMessages.makeAvatar,
  keywords: msg`glyph dicebear profile photo picture figure`,
  icon: SmileIcon,
  run: openGlyphAvatar,
};

export const userCommands = [
  theme('light', msg`Light theme`, msg`bright day white`, SunIcon),
  theme('dark', msg`Dark theme`, msg`night black`, MoonIcon),
  theme('system', msg`System theme`, msg`auto os device`, MonitorIcon),
  glyphAvatar,
];
