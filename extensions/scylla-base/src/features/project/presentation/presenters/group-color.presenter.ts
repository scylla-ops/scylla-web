import type { MessageDescriptor } from '@lingui/core';
import { SWATCH_COLORS } from '@scylla/ui';
import { projectMessages } from '../messages/project.messages.ts';

/** The free color of a picker that has no free color and no recent color yet. */
export const DEFAULT_FREE_COLOR = '#E879F9';

/** The name of a color of the theme, for its button. */
export const swatchName = (token: string): MessageDescriptor => {
  if (token === 'primary') return projectMessages.mainColor;
  if (token === 'muted-foreground') return projectMessages.grey;
  return projectMessages.chartColor(
    SWATCH_COLORS.indexOf(token as (typeof SWATCH_COLORS)[number]) + 1,
  );
};

/**
 * The color that a write of a group sends: undefined when it stays, an empty text when the group
 * goes back to the default folder.
 */
export const colorChange = (
  next: string | undefined,
  current: string | undefined,
): string | undefined => (next === current ? undefined : (next ?? ''));
