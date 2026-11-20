// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DashboardVisibility, type Dashboard } from '@base/generated/scylla/dashboards/v1/dashboard.ts';
import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { WIDGETS_SCHEMA_VERSION, toStored, toWidgets } from '../grpc-dashboard.mapper.ts';

const dashboard = { id: { value: 'd1' }, name: 'Ops', version: 3n, visibility: DashboardVisibility.PRIVATE, teamDefault: false } as unknown as Dashboard;

describe('widgets_json', () => {
  it('writes the target of a dedicated widget and reads it back, in schema version 1', () => {
    const widgets: LayoutWidget[] = [
      { id: 'a', data: 'agent', size: 'l', target: 'agent-1' },
      { id: 'b', data: 'pipeline', size: 'm', target: 'pipeline-1' },
      { id: 'c', data: 'runs-by-hour', size: 's' },
    ];
    const stored = toWidgets(widgets);

    expect(stored.schemaVersion).toBe(WIDGETS_SCHEMA_VERSION);
    expect(WIDGETS_SCHEMA_VERSION).toBe(1);
    expect(JSON.parse(stored.widgetsJson)[2]).toEqual({ id: 'c', data: 'runs-by-hour', size: 's' });
    expect(toStored(dashboard, stored).widgets).toEqual(widgets);
  });

  it('reads a widget list of an older build, with no target', () => {
    const stored = { schemaVersion: 1, widgetsJson: JSON.stringify([{ id: 'a', data: 'runs', size: 'm' }]) };
    expect(toStored(dashboard, stored).widgets).toEqual([{ id: 'a', data: 'runs', size: 'm' }]);
  });
});
