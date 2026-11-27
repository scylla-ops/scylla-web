import type { LucideIcon } from '../../icon.ts';

/** The main action of an empty list: add the first item, or start the first run. */
export interface EmptyStateAction {
  label: string;
  onSelect: () => void;
  /** `Plus` by default: the action adds an item. */
  icon?: LucideIcon;
}
