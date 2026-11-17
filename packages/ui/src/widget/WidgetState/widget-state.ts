/** What a widget shows when it has no data to draw. */
export type WidgetStateKind = 'loading' | 'error' | 'empty' | 'all-clear' | 'locked' | 'missing';

/** The one action of a state: retry a load, choose other data. */
export interface WidgetStateAction {
  label: string;
  onSelect: () => void;
}
