// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_WIDGETS } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { toDashboards, toStored } from '../stored-dashboards.mapper.ts';

describe('stored dashboards', () => {
  it('gives the default dashboard when nothing is stored or the copy does not parse', () => {
    expect(toDashboards(null)).toEqual([{ id: 'default', name: null, widgets: DEFAULT_WIDGETS }]);
    expect(toDashboards('{')).toEqual(toDashboards(null));
  });

  it('drops the unknown widgets, the unknown sizes and the second copy of a widget', () => {
    const raw = JSON.stringify([
      {
        id: 'abc',
        name: 'Release day',
        widgets: [
          { widget: 'pipelines', size: 'l' },
          { widget: 'pipelines', size: 'm' },
          { widget: 'heatmap', size: 'm' },
          { widget: 'activity', size: 'xxl' },
        ],
      },
    ]);
    expect(toDashboards(raw)[1]).toEqual({
      id: 'abc',
      name: 'Release day',
      widgets: [{ widget: 'pipelines', size: 'l' }],
    });
  });

  it('reads back what it stores', () => {
    const dashboards = toDashboards(null);
    expect(toDashboards(toStored(dashboards))).toEqual(dashboards);
  });
});
