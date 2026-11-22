import { msg } from '@lingui/core/macro';

export const heatmapMessages = {
  title: msg({ context: 'heatmap', message: 'Runs by hour' }),
  daysShort: (days: number) => msg({ context: 'heatmap', message: `${days} d` }),
  lastDays: (days: number) => msg({ context: 'heatmap', message: `last ${days} days` }),
  hour: (hour: number) => msg({ context: 'heatmap', message: `${hour} h` }),
  less: msg({ context: 'heatmap', message: 'less' }),
  more: msg({ context: 'heatmap', message: 'more' }),
  busiest: msg({ context: 'heatmap', message: 'busiest' }),
  busiestAt: (day: string, hour: number, runs: number) =>
    msg({ context: 'heatmap', message: `Busiest: ${day} ${hour} h · ${runs} runs` }),
  runs: (runs: number) => msg({ context: 'heatmap', message: `${runs} runs` }),
  grid: msg({ context: 'heatmap', message: 'Runs by weekday and hour' }),
  empty: msg({ context: 'heatmap', message: 'No runs in these days' }),
  emptyText: msg({ context: 'heatmap', message: 'No job started in the days of the grid.' }),
};
