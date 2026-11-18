import {
  LAYOUT_SIZES,
  WIDGET_DATA,
  type DashboardLayout,
  type DashboardSet,
  type LayoutSize,
  type LayoutWidget,
  type WidgetData,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isData = (value: unknown): value is WidgetData => WIDGET_DATA.includes(value as WidgetData);
const isSize = (value: unknown): value is LayoutSize => LAYOUT_SIZES.includes(value as LayoutSize);

const toWidgets = (value: unknown): LayoutWidget[] => {
  if (!Array.isArray(value)) return [];
  const widgets: LayoutWidget[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isData(item.data) || !isSize(item.size)) {
      continue;
    }
    if (widgets.some(widget => widget.id === item.id)) continue;
    widgets.push({ id: item.id, data: item.data, size: item.size });
  }
  return widgets;
};

const toDashboard = (value: unknown): DashboardLayout | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') return undefined;
  if (typeof value.name !== 'string') return undefined;
  return { id: value.id, name: value.name, widgets: toWidgets(value.widgets) };
};

/** `null` when nothing is stored, or the copy has no dashboard that parses. */
export function toDashboardSet(raw: string | null): DashboardSet | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.dashboards)) return null;
  const dashboards = parsed.dashboards.flatMap(item => toDashboard(item) ?? []);
  if (dashboards.length === 0) return null;
  const defaultId =
    typeof parsed.defaultId === 'string' && dashboards.some(item => item.id === parsed.defaultId)
      ? parsed.defaultId
      : dashboards[0].id;
  return { defaultId, dashboards };
}

export function toStored(set: DashboardSet): string {
  return JSON.stringify(set);
}
