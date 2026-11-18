import type { MessageDescriptor } from '@lingui/core';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
import LockIcon from '@lucide/svelte/icons/lock';
import UnlinkIcon from '@lucide/svelte/icons/unlink';
import type { LucideIcon } from '../../icon.ts';
import type { WidgetStateKind } from './widget-state.ts';
import { widgetStateMessages as messages } from './widget-state.messages.ts';

export interface WidgetStateAppearance {
  icon: LucideIcon;
  /** The color of the icon and of the disc behind it. */
  tone: string;
  title: MessageDescriptor;
  description: MessageDescriptor;
}

export const WIDGET_STATE_APPEARANCES: Readonly<
  Record<Exclude<WidgetStateKind, 'loading'>, WidgetStateAppearance>
> = {
  error: {
    icon: CircleAlertIcon,
    tone: 'bg-destructive-subtle text-destructive',
    title: messages.errorTitle,
    description: messages.errorDescription,
  },
  empty: {
    icon: CircleDashedIcon,
    tone: 'bg-muted text-muted-foreground',
    title: messages.emptyTitle,
    description: messages.emptyDescription,
  },
  'all-clear': {
    icon: CircleCheckIcon,
    tone: 'bg-status-passed/15 text-status-passed',
    title: messages.allClearTitle,
    description: messages.allClearDescription,
  },
  locked: {
    icon: LockIcon,
    tone: 'bg-muted text-muted-foreground',
    title: messages.lockedTitle,
    description: messages.lockedDescription,
  },
  missing: {
    icon: UnlinkIcon,
    tone: 'bg-warning/15 text-warning',
    title: messages.missingTitle,
    description: messages.missingDescription,
  },
};
