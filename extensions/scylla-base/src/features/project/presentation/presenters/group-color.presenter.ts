/**
 * The color that a write of a group sends: undefined when it stays, an empty text when the group
 * goes back to the default folder.
 */
export const colorChange = (
  next: string | undefined,
  current: string | undefined,
): string | undefined => (next === current ? undefined : (next ?? ''));
