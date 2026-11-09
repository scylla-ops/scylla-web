import {
  DEFAULT_PRESET,
  PERIOD_PRESETS,
  dayOf,
  type Day,
  type PeriodPreset,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';

/** The period that the user chose: a preset, or the days of a window that the user moved. */
export type PeriodChoice = PeriodPreset | StatsPeriod;

const PERIOD_PARAM = 'period';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

const isDay = (value: string | null): value is Day =>
  !!value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  dayOf(value) === value;

/** Reads `?period=90d` or `?from=2026-10-11&to=2026-11-09`. Any other value gives the default preset. */
export const parsePeriodSearch = (search: string): PeriodChoice => {
  const params = new URLSearchParams(search);
  const from = params.get(FROM_PARAM);
  const to = params.get(TO_PARAM);
  if (isDay(from) && isDay(to)) return { from, to };
  const preset = params.get(PERIOD_PARAM);
  return PERIOD_PRESETS.find(candidate => candidate === preset) ?? DEFAULT_PRESET;
};

/** Writes a choice in a query string, with its `?`, and keeps the other parameters. */
export const writePeriodSearch = (search: string, choice: PeriodChoice): string => {
  const params = new URLSearchParams(search);
  for (const name of [PERIOD_PARAM, FROM_PARAM, TO_PARAM]) params.delete(name);
  if (typeof choice === 'object') {
    params.set(FROM_PARAM, choice.from);
    params.set(TO_PARAM, choice.to);
  } else if (choice !== DEFAULT_PRESET) {
    params.set(PERIOD_PARAM, choice);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};
