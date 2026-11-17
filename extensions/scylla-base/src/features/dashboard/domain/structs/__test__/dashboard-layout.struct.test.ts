// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addWidget,
  defaultDashboard,
  deleteDashboard,
  DEFAULT_DASHBOARD_ID,
  missingWidgets,
  removeWidget,
  resizeWidget,
  upsertDashboard,
  withDefaultDashboard,
} from '../dashboard-layout.struct.ts';

const other = { id: 'abc', name: 'Release day', widgets: [] };

describe('dashboard layout', () => {
  it('puts the default dashboard first, also when the list does not hold it', () => {
    expect(withDefaultDashboard([other]).map(dashboard => dashboard.id)).toEqual([
      DEFAULT_DASHBOARD_ID,
      'abc',
    ]);
  });

  it('adds a widget once, at the end', () => {
    const layout = addWidget(other, 'pipelines', 'l');
    expect(layout.widgets).toEqual([{ widget: 'pipelines', size: 'l' }]);
    expect(addWidget(layout, 'pipelines', 'm')).toBe(layout);
  });

  it('removes and resizes a widget', () => {
    const layout = resizeWidget(defaultDashboard(), 'activity', 'l');
    expect(layout.widgets.find(item => item.widget === 'activity')?.size).toBe('l');
    expect(missingWidgets(removeWidget(layout, 'activity'))).toEqual(['activity']);
  });

  it('replaces a dashboard of the same id, or adds it', () => {
    const renamed = { ...other, name: 'Deploys' };
    expect(upsertDashboard([other], renamed)).toEqual([renamed]);
    expect(upsertDashboard([], other)).toEqual([other]);
  });

  it('never deletes the default dashboard', () => {
    const list = withDefaultDashboard([other]);
    expect(deleteDashboard(list, DEFAULT_DASHBOARD_ID)).toHaveLength(2);
    expect(deleteDashboard(list, 'abc')).toHaveLength(1);
  });
});
