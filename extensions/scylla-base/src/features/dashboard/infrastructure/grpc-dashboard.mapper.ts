import {
  DashboardVisibility as GrpcVisibility,
  type Dashboard,
  type DashboardWidgets,
} from '@base/generated/scylla/dashboards/v1/dashboard.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { StoredDashboard } from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import type {
  DashboardVisibility,
  LayoutWidget,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { toWidgetList } from './stored-dashboards.mapper.ts';

/** The format of `widgets_json`. A change of the format takes the next number. */
export const WIDGETS_SCHEMA_VERSION = 1;

/** A dashboard of the server. Widgets in a format that this build does not know give no widget. */
export const toStored = (dashboard: Dashboard, widgets?: DashboardWidgets): StoredDashboard => {
  let parsed: unknown = [];
  if (widgets && widgets.schemaVersion === WIDGETS_SCHEMA_VERSION && widgets.widgetsJson) {
    try {
      parsed = JSON.parse(widgets.widgetsJson);
    } catch {
      parsed = [];
    }
  }
  return {
    id: idValue(dashboard.id),
    name: dashboard.name,
    widgets: toWidgetList(parsed),
    version: Number(dashboard.version),
    visibility: dashboard.visibility === GrpcVisibility.WORKSPACE ? 'workspace' : 'private',
    teamDefault: dashboard.teamDefault,
  };
};

export const toWidgets = (widgets: readonly LayoutWidget[]): DashboardWidgets => ({
  schemaVersion: WIDGETS_SCHEMA_VERSION,
  widgetsJson: JSON.stringify(widgets.map(({ id, data, size }) => ({ id, data, size }))),
});

/** Not set: the server keeps the visibility of a change, and makes a new dashboard private. */
export const toVisibility = (visibility?: DashboardVisibility): GrpcVisibility =>
  visibility === 'workspace'
    ? GrpcVisibility.WORKSPACE
    : visibility === 'private'
      ? GrpcVisibility.PRIVATE
      : GrpcVisibility.UNSPECIFIED;
