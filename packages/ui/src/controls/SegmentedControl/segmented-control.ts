import type { LucideIcon } from '../../icon.ts';

export type SegmentedSize = 'default' | 'sm';

/** A dot before the label. It paints with `currentColor`: give it a text color class. */
export interface SegmentedDot {
  color: string;
  /** A ring with no fill. */
  hollow?: boolean;
  /** A ring grows from the dot when the count grows. */
  pulse?: boolean;
}

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** A chip after the label. At 0, the segment fades while it is not selected. */
  count?: number;
  dot?: SegmentedDot;
}
