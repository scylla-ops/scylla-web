import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import MoonIcon from '@lucide/svelte/icons/moon';
import SunIcon from '@lucide/svelte/icons/sun';
import type { LucideIcon } from '@scylla/ui';
import type { ChoiceCommand } from '@scylla/core-sdk';
import {
  currentThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@scylla/ui/stores';

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

export const userCommands = [
  theme('light', msg`Light theme`, msg`bright day white`, SunIcon),
  theme('dark', msg`Dark theme`, msg`night black`, MoonIcon),
  theme('system', msg`System theme`, msg`auto os device`, MonitorIcon),
];
