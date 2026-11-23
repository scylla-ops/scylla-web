import { formatNumber, intlLocale } from '@scylla/ui/i18n';

/**
 * Cached per locale, never at import time: the locale changes at runtime. The locale is the rune
 * of the UI, so a date in a template follows a switch of the language.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const getDateFormatter = (key: string, options: Intl.DateTimeFormatOptions) => {
  const cacheKey = `${intlLocale()}:${key}`;
  let formatter = dateFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intlLocale(), options);
    dateFormatters.set(cacheKey, formatter);
  }
  return formatter;
};

const getRelativeFormatter = () => {
  const locale = intlLocale();
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    // 'short': 'narrow' renders French as "-3 j", which reads as a negative number.
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    relativeFormatters.set(locale, formatter);
  }
  return formatter;
};

export const calculateDuration = (createdAt: string, updatedAt: string): number => {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  return Math.floor((end - start) / 1000);
};

/** From the start (not the creation) to the end, in seconds. `null` while pending; counts up while running. */
export const calculateExecutionDuration = (
  startedAt?: string,
  finishedAt?: string,
): number | null => {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
};

/** English keeps its compact units: "1m 12s". The narrow French units have no space ("1min"). */
const durationPart = (value: number, unit: 'hour' | 'minute' | 'second'): string =>
  formatNumber(value, {
    style: 'unit',
    unit,
    unitDisplay: intlLocale() === 'en' ? 'narrow' : 'short',
  });

/** E.g. "1m 12s", "45s", "2h 15m"; "1 min 12 s", "45 s", "2 h 15 min" in French. */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${durationPart(hours, 'hour')} ${durationPart(minutes, 'minute')}`;
  if (minutes > 0) return `${durationPart(minutes, 'minute')} ${durationPart(secs, 'second')}`;
  return durationPart(secs, 'second');
};

export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const rtf = getRelativeFormatter();

  if (diffDays > 0) return rtf.format(-diffDays, 'day');
  if (diffHours > 0) return rtf.format(-diffHours, 'hour');
  if (diffMinutes > 0) return rtf.format(-diffMinutes, 'minute');
  if (diffSeconds > 0) return rtf.format(-diffSeconds, 'second');
  return rtf.format(0, 'second');
};

export function formatDate(isoString: string | undefined): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  return getDateFormatter('dateTime', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(date);
}

export function formatDay(isoString: string | undefined): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  return getDateFormatter('day', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

const UTC_DAY_FORMATS = {
  day: { day: 'numeric', month: 'short' },
  month: { month: 'short' },
  weekday: { weekday: 'short', day: 'numeric', month: 'short' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** A day in UTC, as the server counts the stats, with no year: "14 Jul", "Jul", "Tue 22 Sep". */
export const formatUtcDay = (day: string, style: keyof typeof UTC_DAY_FORMATS = 'day'): string =>
  getDateFormatter(`utc-${style}`, { ...UTC_DAY_FORMATS[style], timeZone: 'UTC' }).format(
    new Date(day),
  );

export function formatTime(isoString: string | undefined): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  return getDateFormatter('time', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(date);
}
