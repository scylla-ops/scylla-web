// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { firstDashboardSet } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { toDashboardSet, toStored, toWidgetList } from '../stored-dashboards.mapper.ts';

describe('stored dashboards', () => {
  it('gives nothing when nothing is stored, or the copy does not parse', () => {
    expect(toDashboardSet(null)).toBeNull();
    expect(toDashboardSet('{')).toBeNull();
    expect(toDashboardSet(JSON.stringify([{ id: 'a' }]))).toBeNull();
  });

  it('drops the unknown data, the unknown sizes and a second widget of one id', () => {
    const raw = JSON.stringify({
      defaultId: 'gone',
      dashboards: [
        {
          id: 'a',
          name: 'Release day',
          widgets: [
            { id: 'w1', data: 'pipelines', size: 'l' },
            { id: 'w1', data: 'runs', size: 'm' },
            { id: 'w2', data: 'heatmap', size: 'm' },
            { id: 'w3', data: 'runs', size: 'xxl' },
          ],
        },
      ],
    });
    expect(toDashboardSet(raw)).toEqual({
      defaultId: 'a',
      dashboards: [{ id: 'a', name: 'Release day', widgets: [{ id: 'w1', data: 'pipelines', size: 'l' }] }],
    });
  });

  it('reads back what it stores', () => {
    const set = firstDashboardSet('Ops overview');
    expect(toDashboardSet(toStored(set))).toEqual(set);
  });

  it('keeps the target of a dedicated widget, and drops a target that is not a text', () => {
    expect(
      toWidgetList([
        { id: 'w1', data: 'agent', size: 's', target: 'agent-1' },
        { id: 'w2', data: 'pipeline', size: 'm', target: '' },
        { id: 'w3', data: 'pipeline', size: 'm', target: 42 },
      ]),
    ).toEqual([
      { id: 'w1', data: 'agent', size: 's', target: 'agent-1' },
      { id: 'w2', data: 'pipeline', size: 'm' },
      { id: 'w3', data: 'pipeline', size: 'm' },
    ]);
  });
});
