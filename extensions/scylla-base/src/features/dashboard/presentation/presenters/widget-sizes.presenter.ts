import type { SegmentedOption } from '@scylla/ui';
import type {
  LayoutSize,
  WidgetKind,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/**
 * The sizes that each widget can show today. A size that is not in the list has no layout yet:
 * the edit mode does not offer it.
 */
export const WIDGET_SIZES: Readonly<Record<WidgetKind, readonly LayoutSize[]>> = {
  'success-rate': ['m'],
  'run-duration': ['m'],
  'right-now': ['m', 'l'],
  'needs-you': ['m', 'l'],
  pipelines: ['m', 'l'],
  activity: ['m', 'l'],
  'quick-actions': ['m'],
};

const SIZE_LABELS: Readonly<Record<LayoutSize, string>> = {
  xs: 'XS',
  s: 'S',
  m: 'M',
  l: 'L',
};

/** The first size of the list: the size of a widget that the user adds. */
export const firstSize = (widget: WidgetKind): LayoutSize => WIDGET_SIZES[widget][0] ?? 'm';

/** A stored size that the widget cannot show any more becomes its first size. */
export const shownSize = (widget: WidgetKind, size: LayoutSize): LayoutSize =>
  WIDGET_SIZES[widget].includes(size) ? size : firstSize(widget);

export const sizeOptions = (widget: WidgetKind): SegmentedOption<LayoutSize>[] =>
  WIDGET_SIZES[widget].map(size => ({ value: size, label: SIZE_LABELS[size] }));
