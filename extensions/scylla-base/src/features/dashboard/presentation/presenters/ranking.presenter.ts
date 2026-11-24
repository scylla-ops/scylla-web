import { deltaTrend } from '@scylla/ui';
import type { JobFigures, JobGroup } from '@base/features/jobs';
import {
  durationText,
  type ChangeView,
} from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';

export type RankingMetric = 'slowest' | 'failing';

export interface RankingRow {
  id: string;
  rank: number;
  name: string;
  project: string;
  value: string;
  bar: number;
  change: ChangeView | null;
}

const MINUS = '−';

const failures = (figures: JobFigures): number => figures.outcomes.failed + figures.outcomes.orphaned;

const valueOf = (metric: RankingMetric, figures: JobFigures): number | null => {
  if (metric === 'slowest') return figures.p50Duration;
  const count = failures(figures);
  return count > 0 ? count : null;
};

const previousOf = (metric: RankingMetric, figures: JobFigures): number | null =>
  metric === 'slowest' ? figures.p50Duration : failures(figures);

const signed = (delta: number, text: string): string =>
  delta === 0 ? text : `${delta > 0 ? '+' : MINUS}${text}`;

const changeOf = (metric: RankingMetric, now: number, before: number | null): ChangeView | null => {
  if (before === null) return null;
  const delta = Math.round(now - before);
  const text = metric === 'slowest' ? durationText(Math.abs(delta)) : String(Math.abs(delta));
  return { label: signed(delta, text), ...deltaTrend(delta, 'down') };
};

export const rankingRows = (
  groups: readonly JobGroup[],
  metric: RankingMetric,
  nameOf: (id: string) => { name: string; project: string } | undefined,
): RankingRow[] => {
  const ranked = groups
    .map(group => ({ group, value: valueOf(metric, group.figures) }))
    .filter((item): item is { group: JobGroup; value: number } => item.value !== null)
    .map(item => ({ ...item, names: nameOf(item.group.id) ?? { name: item.group.id.slice(-8), project: '' } }))
    .sort((a, b) => b.value - a.value || a.names.name.localeCompare(b.names.name));
  const top = Math.max(1, ...ranked.map(item => item.value));
  return ranked.map(({ group, value, names }, index) => ({
    id: group.id,
    rank: index + 1,
    name: names.name,
    project: names.project,
    value: metric === 'slowest' ? durationText(value) : String(value),
    bar: (value / top) * 100,
    change: changeOf(metric, value, group.previous ? previousOf(metric, group.previous) : null),
  }));
};
