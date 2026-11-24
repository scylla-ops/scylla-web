import type { LucideIcon } from '@scylla/ui';

/** How much of an action shows: its label, its short label, or its icon alone. */
export type FitLevel = 'full' | 'short' | 'icon';

/** The measured widths of an action in each level, in px. */
export interface FitWidths {
  full: number;
  short: number;
  icon: number;
}

/** An action of a row that shortens its label when the row is narrow. */
export interface FitAction {
  key: string;
  label: string;
  /** The same as `label` when there is no shorter form. */
  short: string;
  icon: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost';
  /** The icon also shows beside a label. */
  labeledIcon?: boolean;
  /** The action cannot run now. */
  disabled?: boolean;
  onclick: () => void;
}

const NEXT: Readonly<Record<FitLevel, FitLevel | null>> = { full: 'short', short: 'icon', icon: null };

/**
 * The level of each action so that the row fits in `available` px. The actions shorten in
 * `order` (indexes): the first one goes to its short label, then to its icon, before the next one
 * starts. A short label that is not narrower is skipped.
 */
export const fitLevels = (
  available: number,
  gap: number,
  widths: readonly FitWidths[],
  order: readonly number[],
): FitLevel[] => {
  const levels: FitLevel[] = widths.map(() => 'full');
  const total = () =>
    widths.reduce((sum, width, index) => sum + width[levels[index]], 0) + gap * Math.max(0, widths.length - 1);
  for (const index of order) {
    let next = NEXT[levels[index]];
    while (next && total() > available) {
      if (!(next === 'short' && widths[index].short >= widths[index].full)) levels[index] = next;
      next = NEXT[next];
    }
    if (total() <= available) break;
  }
  return levels;
};
