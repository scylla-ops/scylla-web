/** `01m4gcb7…k2p9`: the first 8 and the last 4 characters. */
export const shortId = (id: string): string =>
  id.length > 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

const pad = (value: number): string => String(value).padStart(2, '0');

/** `42 s`, `1 min 42 s`, `2 h 05 min`. The units read the same in English and French. */
export const formatDurationMs = (ms: number): string => {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${pad(seconds % 60)} s`;

  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
};

/** Whole gigabytes from 1 GB up, else megabytes. The unit is translated by the caller. */
export const memoryAmount = (megabytes: number): { amount: number; unit: 'GB' | 'MB' } =>
  megabytes >= 1024
    ? { amount: Math.round(megabytes / 1024), unit: 'GB' }
    : { amount: megabytes, unit: 'MB' };

/** `0.5.0` and `v0.5.0` both show as `v0.5.0`. */
export const versionTag = (version: string): string =>
  version.startsWith('v') ? version : `v${version}`;

export const formatPercent = (rate: number, locale: string, fractionDigits = 0): string =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: fractionDigits,
  }).format(rate);

/** `Oct 11, 16:40` in the locale: a recent moment, for which the year adds nothing. */
export const formatDayTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
