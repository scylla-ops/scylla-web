import type { LucideIcon } from '../../icon.ts';

/** What a widget shows when it has no data to draw. */
export type WidgetStateKind = 'loading' | 'error' | 'empty' | 'all-clear' | 'locked' | 'missing';

/** The one action of a state: retry a load, choose other data, add the first item. */
export interface WidgetStateAction {
  label: string;
  onSelect: () => void;
  /** `RotateCw` by default: the action reads the data again. */
  icon?: LucideIcon;
}
