import {
  LAYOUT_SIZES,
  WIDGET_KINDS,
  withDefaultDashboard,
  type DashboardLayout,
  type LayoutSize,
  type LayoutWidget,
  type WidgetKind,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isKind = (value: unknown): value is WidgetKind =>
  WIDGET_KINDS.includes(value as WidgetKind);

const isSize = (value: unknown): value is LayoutSize => LAYOUT_SIZES.includes(value as LayoutSize);

const toWidgets = (value: unknown): LayoutWidget[] => {
  if (!Array.isArray(value)) return [];
  const widgets: LayoutWidget[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isKind(item.widget) || !isSize(item.size)) continue;
    if (widgets.some(widget => widget.widget === item.widget)) continue;
    widgets.push({ widget: item.widget, size: item.size });
  }
  return widgets;
};

const toDashboard = (value: unknown): DashboardLayout | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') return undefined;
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : null,
    widgets: toWidgets(value.widgets),
  };
};

/** A copy that does not parse, or a part of it, is dropped: the default dashboard stays. */
export function toDashboards(raw: string | null): DashboardLayout[] {
  if (raw === null) return withDefaultDashboard([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return withDefaultDashboard([]);
  }
  const list = Array.isArray(parsed) ? parsed : [];
  return withDefaultDashboard(list.flatMap(item => toDashboard(item) ?? []));
}

export function toStored(dashboards: readonly DashboardLayout[]): string {
  return JSON.stringify(dashboards);
}
