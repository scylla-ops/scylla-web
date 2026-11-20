import {
  PERIOD_KINDS,
  DEFAULT_PERIOD,
  type DashboardPeriod,
  type PresetPeriodKind,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import type { Day } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

const PERIOD_PARAM = 'period';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

const isDay = (value: string | null): value is Day =>
  !!value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

const isPreset = (value: string | null): value is PresetPeriodKind =>
  value !== 'custom' && PERIOD_KINDS.some(kind => kind === value);

/** Reads `?period=7d` or `?from=2026-11-01&to=2026-11-14`. Any other value gives `null`. */
export const parsePeriodSearch = (search: string): DashboardPeriod | null => {
  const params = new URLSearchParams(search);
  const from = params.get(FROM_PARAM);
  const to = params.get(TO_PARAM);
  if (isDay(from) && isDay(to)) return { kind: 'custom', from, to };
  const preset = params.get(PERIOD_PARAM);
  return isPreset(preset) ? { kind: preset } : null;
};

/** Writes a period in a query string, with its `?`, and keeps the other parameters. */
export const writePeriodSearch = (search: string, period: DashboardPeriod): string => {
  const params = new URLSearchParams(search);
  for (const name of [PERIOD_PARAM, FROM_PARAM, TO_PARAM]) params.delete(name);
  if (period.kind === 'custom') {
    params.set(FROM_PARAM, period.from);
    params.set(TO_PARAM, period.to);
  } else if (period.kind !== DEFAULT_PERIOD.kind) {
    params.set(PERIOD_PARAM, period.kind);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};
