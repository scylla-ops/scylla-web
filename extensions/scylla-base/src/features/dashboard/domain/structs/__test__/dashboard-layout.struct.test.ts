// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addWidget,
  changeWidget,
  dashboardOf,
  deleteDashboard,
  firstDashboardSet,
  moveWidget,
  removeWidget,
  TEMPLATES,
  upsertDashboard,
  type LayoutWidget,
} from '../dashboard-layout.struct.ts';

const widget = (id: string): LayoutWidget => ({ id, data: 'runs', size: 'm' });

describe('dashboard layout', () => {
  it('starts a workspace with the default layout of the design', () => {
    const set = firstDashboardSet('Ops overview');
    expect(set.dashboards).toHaveLength(1);
    expect(dashboardOf(set, null)?.widgets).toEqual(TEMPLATES.bento);
    expect(TEMPLATES.bento.map(item => item.size)).toEqual(['l', 'm', 'm', 'l', 's', 's', 'm', 'm', 'xs', 'xs', 'xs', 'xs']);
  });

  it('adds, removes, changes and moves a widget', () => {
    const list = addWidget([widget('a'), widget('b')], widget('c'), 1);
    expect(list.map(item => item.id)).toEqual(['a', 'c', 'b']);
    expect(removeWidget(list, 'c').map(item => item.id)).toEqual(['a', 'b']);
    expect(changeWidget(list, 'b', { size: 'l' })[2].size).toBe('l');
    expect(moveWidget(list, 'a', 2).map(item => item.id)).toEqual(['c', 'b', 'a']);
  });

  it('opens the default dashboard with no id, and nothing for an unknown id', () => {
    const set = upsertDashboard(firstDashboardSet('Ops'), { id: 'b', name: 'Release day', widgets: [] });
    expect(dashboardOf({ ...set, defaultId: 'b' }, null)?.name).toBe('Release day');
    expect(dashboardOf(set, 'nope')).toBeUndefined();
  });

  it('keeps the last dashboard, and moves the default when it goes', () => {
    const one = firstDashboardSet('Ops');
    expect(deleteDashboard(one, 'default')).toBe(one);
    const two = upsertDashboard(one, { id: 'b', name: 'B', widgets: [] });
    expect(deleteDashboard(two, 'default')).toEqual({ defaultId: 'b', dashboards: [two.dashboards[1]] });
  });
});
